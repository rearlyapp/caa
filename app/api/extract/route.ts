import { NextResponse } from "next/server"
import { getCaseById, updateCase } from "@/lib/store"
import type { AadhaarData, Case, DirectorDocument, PanData } from "@/lib/types"

type DocumentType = "pan" | "aadhaar"

interface ExtractRequestBody {
  caseId?: string
  directorIndex?: number
  documentType?: DocumentType
  imageBase64?: string
}

interface BackendExtractResponse {
  extracted_data?: Record<string, string>
  extractedData?: Record<string, string>
  elapsed?: number
  raw_text?: string
  detail?: string
  error?: string
  [key: string]: unknown
}

interface CoreDocProgress {
  anyStarted: boolean
  allDone: boolean
}

interface TargetDocRef {
  doc: DirectorDocument
  docIndex: number
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "")
}

function getModalEndpoint(): string {
  const modalUrl = process.env.MODAL_API_URL
  if (!modalUrl) {
    throw new Error("MODAL_API_URL is not configured. Modal-only mode requires this.")
  }
  return normalizeUrl(modalUrl)
}

function cloneDirectors(caseData: Case): Case["directors"] {
  return caseData.directors.map((director) => ({
    ...director,
    documents: director.documents.map((doc) => ({ ...doc })),
  })) as Case["directors"]
}

function toPanData(data: Record<string, string>): PanData {
  return {
    name: data.name?.trim() ?? "",
    fathers_name: data.fathers_name?.trim() ?? "",
    date_of_birth: data.date_of_birth?.trim() ?? "",
    pan_number: data.pan_number?.replace(/\s+/g, "").toUpperCase() ?? "",
  }
}

function toAadhaarData(data: Record<string, string>): AadhaarData {
  const digits = (data.aadhaar_number ?? "").replace(/\D/g, "")
  const formattedAadhaar =
    digits.length === 12
      ? `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
      : (data.aadhaar_number?.trim() ?? "")

  return {
    name: data.name?.trim() ?? "",
    aadhaar_number: formattedAadhaar,
    date_of_birth: data.date_of_birth?.trim() ?? "",
    gender: data.gender?.trim().toUpperCase() ?? "",
    address: data.address?.trim() ?? "",
  }
}

function getCoreDocProgress(directors: Case["directors"]): CoreDocProgress {
  let uploadedCount = 0
  let doneCount = 0
  const totalRequiredCoreDocs = 4

  for (const director of directors) {
    for (const type of ["pan", "aadhaar"] as const) {
      const doc = director.documents.find((item) => item.type === type)
      if (!doc) continue
      uploadedCount += 1
      if (doc.status === "done") doneCount += 1
    }
  }

  return {
    anyStarted: uploadedCount > 0,
    allDone: uploadedCount === totalRequiredCoreDocs && doneCount === totalRequiredCoreDocs,
  }
}

function inferMimeFromDataUrl(dataUrl?: string): string | undefined {
  if (!dataUrl || !dataUrl.startsWith("data:")) return undefined
  const semicolonIndex = dataUrl.indexOf(";")
  if (semicolonIndex < 0) return undefined
  const header = dataUrl.slice(5, semicolonIndex)
  return header || undefined
}

function getTargetDocRef(
  directors: Case["directors"],
  directorIndex: number,
  documentType: DocumentType
): TargetDocRef | null {
  const docIndex = directors[directorIndex].documents.findIndex(
    (doc) => doc.type === documentType
  )
  if (docIndex < 0) return null
  return {
    doc: directors[directorIndex].documents[docIndex],
    docIndex,
  }
}

async function callModalExtract(payload: {
  image_base64: string
  document_type: DocumentType
  file_name?: string
  mime_type?: string
}): Promise<BackendExtractResponse> {
  const endpoint = getModalEndpoint()

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network failure"
    throw new Error(`Unable to reach Modal endpoint at ${endpoint}. ${message}.`)
  }

  const text = await response.text()
  let parsed: BackendExtractResponse | null = null
  if (text) {
    try {
      parsed = JSON.parse(text) as BackendExtractResponse
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    const detail =
      parsed?.detail || parsed?.error || text || `Modal call failed (${response.status})`
    throw new Error(detail)
  }

  return parsed ?? {}
}

export async function POST(request: Request) {
  const body = (await request.json()) as ExtractRequestBody
  const { caseId, directorIndex, documentType, imageBase64 } = body

  if (!caseId || directorIndex === undefined || !documentType) {
    return NextResponse.json(
      { error: "Missing required fields: caseId, directorIndex, documentType" },
      { status: 400 }
    )
  }
  if (directorIndex < 0 || directorIndex > 1) {
    return NextResponse.json({ error: "directorIndex must be 0 or 1" }, { status: 400 })
  }
  if (documentType !== "pan" && documentType !== "aadhaar") {
    return NextResponse.json({ error: "documentType must be pan or aadhaar" }, { status: 400 })
  }

  const initialCase = getCaseById(caseId)
  if (!initialCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  const processingDirectors = cloneDirectors(initialCase)
  const processingTarget = getTargetDocRef(processingDirectors, directorIndex, documentType)
  if (!processingTarget) {
    return NextResponse.json(
      { error: `No ${documentType} document uploaded for director ${directorIndex + 1}` },
      { status: 400 }
    )
  }

  const contentBase64 = imageBase64 ?? processingTarget.doc.contentBase64
  if (!contentBase64) {
    return NextResponse.json(
      { error: "Document content is missing. Re-upload and retry extraction." },
      { status: 400 }
    )
  }

  processingDirectors[directorIndex].documents[processingTarget.docIndex] = {
    ...processingTarget.doc,
    contentBase64,
    status: "processing",
  }
  processingDirectors[directorIndex].validated = false
  if (documentType === "pan") {
    processingDirectors[directorIndex].panData = undefined
  } else {
    processingDirectors[directorIndex].aadhaarData = undefined
  }

  updateCase(caseId, {
    directors: processingDirectors,
    inferenceMode: "modal",
    status: "extracting",
  })

  try {
    const backendResponse = await callModalExtract({
      image_base64: contentBase64,
      document_type: documentType,
      file_name: processingTarget.doc.fileName,
      mime_type: inferMimeFromDataUrl(processingTarget.doc.fileUrl),
    })

    const rawData =
      backendResponse.extracted_data ??
      backendResponse.extractedData ??
      (backendResponse as Record<string, string>)

    const latestCase = getCaseById(caseId)
    if (!latestCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const mergedDirectors = cloneDirectors(latestCase)
    const latestTarget = getTargetDocRef(mergedDirectors, directorIndex, documentType)
    if (!latestTarget) {
      return NextResponse.json(
        { error: "Document was removed while extraction was in progress." },
        { status: 409 }
      )
    }

    mergedDirectors[directorIndex].documents[latestTarget.docIndex] = {
      ...latestTarget.doc,
      contentBase64: latestTarget.doc.contentBase64 ?? contentBase64,
      status: "done",
      extractedData: rawData,
    }

    if (documentType === "pan") {
      mergedDirectors[directorIndex].panData = toPanData(rawData)
    } else {
      mergedDirectors[directorIndex].aadhaarData = toAadhaarData(rawData)
    }
    mergedDirectors[directorIndex].validated = false

    const { anyStarted, allDone } = getCoreDocProgress(mergedDirectors)

    updateCase(caseId, {
      directors: mergedDirectors,
      inferenceMode: "modal",
      status: allDone ? "reviewing" : anyStarted ? "extracting" : "draft",
    })

    return NextResponse.json({
      success: true,
      inferenceMode: "modal",
      extractedData: rawData,
      elapsed: backendResponse.elapsed,
      rawText: backendResponse.raw_text,
    })
  } catch (error) {
    const latestCase = getCaseById(caseId)
    if (latestCase) {
      const mergedDirectors = cloneDirectors(latestCase)
      const latestTarget = getTargetDocRef(mergedDirectors, directorIndex, documentType)

      if (latestTarget) {
        mergedDirectors[directorIndex].documents[latestTarget.docIndex] = {
          ...latestTarget.doc,
          status: "error",
        }

        const { anyStarted, allDone } = getCoreDocProgress(mergedDirectors)
        updateCase(caseId, {
          directors: mergedDirectors,
          inferenceMode: "modal",
          status: allDone ? "reviewing" : anyStarted ? "extracting" : "draft",
        })
      }
    }

    const message = error instanceof Error ? error.message : "Extraction failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
