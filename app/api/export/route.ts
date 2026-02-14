import { NextResponse } from "next/server"
import { getCaseById, updateCase } from "@/lib/store"

interface ExportRequestBody {
  caseId?: string
}

interface BackendExportResponse {
  success?: boolean
  file_name?: string
  file_content_base64?: string
  template_used?: string
  detail?: string
}

const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:8000"

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "")
}

function getLocalBackendUrl(): string {
  return normalizeUrl(process.env.LOCAL_API_URL ?? DEFAULT_LOCAL_API_URL)
}

export async function POST(request: Request) {
  const body = (await request.json()) as ExportRequestBody
  const { caseId } = body

  if (!caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 })
  }

  const caseData = getCaseById(caseId)
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  try {
    const backendRes = await fetch(`${getLocalBackendUrl()}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_name: caseData.name,
        case_data: caseData,
      }),
    })

    const text = await backendRes.text()
    let parsed: BackendExportResponse = {}
    if (text) {
      try {
        parsed = JSON.parse(text) as BackendExportResponse
      } catch {
        parsed = {}
      }
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: parsed.detail ?? "Excel export backend failed" },
        { status: 502 }
      )
    }

    updateCase(caseId, { status: "complete" })

    return NextResponse.json({
      success: parsed.success ?? true,
      fileName:
        parsed.file_name ??
        `${caseData.name.replace(/\s+/g, "_")}_Checklist_filled.xlsx`,
      fileContentBase64: parsed.file_content_base64 ?? "",
      message: "Excel file generated successfully",
      fieldsFilled: calculateFieldsFilled(caseData),
      totalFields: 32,
      templateUsed: parsed.template_used,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Excel generation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function calculateFieldsFilled(caseData: ReturnType<typeof getCaseById>): number {
  if (!caseData) return 0
  let count = 0

  for (const director of caseData.directors) {
    if (director.panData?.name) count++
    if (director.panData?.fathers_name) count++
    if (director.panData?.date_of_birth) count++
    if (director.panData?.pan_number) count++
    if (director.aadhaarData?.aadhaar_number) count++
    if (director.aadhaarData?.address) count++
    if (director.placeOfBirth) count++
    if (director.occupation) count++
    if (director.education) count++
    if (director.email) count++
    if (director.mobile) count++
    if (director.dinNumber) count++
    if (director.sharesSubscribed) count++
    if (director.durationAtAddress) count++
  }

  if (caseData.companyInfo.officeEmail) count++
  if (caseData.companyInfo.officeMobile) count++
  if (caseData.companyInfo.authorizedShareCapital) count++
  if (caseData.companyInfo.paidUpShareCapital) count++
  if (caseData.professionalInfo.name) count++
  if (caseData.professionalInfo.membershipNo) count++
  if (caseData.professionalInfo.address) count++

  return count
}
