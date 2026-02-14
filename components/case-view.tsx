"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { UploadZone } from "@/components/upload-zone"
import type { AadhaarData, Case, DirectorDocument, PanData } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())
const CORE_DOC_TYPES: Array<"pan" | "aadhaar"> = ["pan", "aadhaar"]

interface CaseViewProps {
  caseId: string
}

type ProcessStatus = "queued" | "processing" | "done" | "error"

type ReviewDocType = "pan" | "aadhaar"

interface ProcessDetail {
  status: ProcessStatus
  message: string
}

interface PreviewTarget {
  title: string
  fileUrl: string
  isPdf: boolean
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Unable to read selected file"))
    reader.readAsDataURL(file)
  })
}

function parseApiError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error
  }
  return fallback
}

function keyFor(directorIndex: number, type: "pan" | "aadhaar"): string {
  return `${directorIndex}-${type}`
}

function labelFor(directorIndex: number, type: "pan" | "aadhaar"): string {
  return `Director ${directorIndex + 1} ${type === "pan" ? "PAN" : "Aadhaar"}`
}

function statusIcon(status: ProcessStatus) {
  if (status === "processing") {
    return <Loader2 className="h-4 w-4 animate-spin text-warning" />
  }
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-success" />
  }
  if (status === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive" />
  }
  return <Clock3 className="h-4 w-4 text-muted-foreground" />
}

function cloneDirectors(caseData: Case): Case["directors"] {
  return caseData.directors.map((director) => ({
    ...director,
    documents: director.documents.map((doc) => ({ ...doc })),
  })) as Case["directors"]
}

function emptyPanData(): PanData {
  return {
    name: "",
    fathers_name: "",
    date_of_birth: "",
    pan_number: "",
  }
}

function emptyAadhaarData(): AadhaarData {
  return {
    name: "",
    aadhaar_number: "",
    date_of_birth: "",
    gender: "",
    address: "",
  }
}

function isPdfDocument(doc?: DirectorDocument): boolean {
  if (!doc) return false
  return (
    doc.fileUrl.startsWith("data:application/pdf") ||
    doc.fileName.toLowerCase().endsWith(".pdf")
  )
}

function isImageDocument(doc?: DirectorDocument): boolean {
  if (!doc) return false
  return doc.fileUrl.startsWith("data:image/")
}

export function CaseView({ caseId }: CaseViewProps) {
  const { data: caseData, mutate } = useSWR<Case>(`/api/cases/${caseId}`, fetcher)
  const router = useRouter()

  const [batchProcessing, setBatchProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, string>>({})
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, DirectorDocument["status"]>
  >({})
  const [progressDetails, setProgressDetails] = useState<Record<string, ProcessDetail>>({})
  const [activeReviewDoc, setActiveReviewDoc] = useState<[ReviewDocType, ReviewDocType]>([
    "pan",
    "pan",
  ])
  const [editedPan, setEditedPan] = useState<Record<number, PanData>>({})
  const [editedAadhaar, setEditedAadhaar] = useState<Record<number, AadhaarData>>({})
  const [approvingDirector, setApprovingDirector] = useState<[boolean, boolean]>([
    false,
    false,
  ])
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null)

  const updateCase = useCallback(
    async (payload: Partial<Case>) => {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(parseApiError(data, "Unable to update case"))
      }
    },
    [caseId]
  )

  const extractSingleDocument = useCallback(
    async (
      directorIndex: number,
      documentType: "pan" | "aadhaar",
      imageBase64?: string
    ): Promise<boolean> => {
      const key = keyFor(directorIndex, documentType)
      setStatusOverrides((prev) => ({ ...prev, [key]: "processing" }))
      setProgressDetails((prev) => ({
        ...prev,
        [key]: { status: "processing", message: "Extracting..." },
      }))

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          directorIndex,
          documentType,
          imageBase64,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message = parseApiError(
          payload,
          `Extraction failed for ${labelFor(directorIndex, documentType)}`
        )
        setStatusOverrides((prev) => ({ ...prev, [key]: "error" }))
        setProgressDetails((prev) => ({
          ...prev,
          [key]: { status: "error", message },
        }))
        return false
      }

      const elapsed =
        payload && typeof payload.elapsed === "number"
          ? `${Number(payload.elapsed).toFixed(1)}s`
          : "Done"
      setStatusOverrides((prev) => ({ ...prev, [key]: "done" }))
      setProgressDetails((prev) => ({
        ...prev,
        [key]: { status: "done", message: elapsed },
      }))

      await mutate()
      return true
    },
    [caseId, mutate]
  )

  const handleFileSelect = useCallback(
    async (file: File, docType: string, directorIndex: number) => {
      if (!caseData) return

      const typedDoc = docType as DirectorDocument["type"]
      const coreKey =
        typedDoc === "pan" || typedDoc === "aadhaar"
          ? keyFor(directorIndex, typedDoc)
          : undefined

      setErrorMessage("")
      if (coreKey) {
        setUploadingKeys((prev) => ({ ...prev, [coreKey]: file.name }))
      }

      try {
        const dataUrl = await toDataUrl(file)
        const contentBase64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl

        const directors = cloneDirectors(caseData)

        const newDoc: DirectorDocument = {
          id: `doc-${Date.now()}`,
          type: typedDoc,
          fileName: file.name,
          fileUrl: dataUrl,
          contentBase64,
          status: "pending",
        }

        const existingIdx = directors[directorIndex].documents.findIndex(
          (doc) => doc.type === typedDoc
        )
        if (existingIdx >= 0) {
          directors[directorIndex].documents[existingIdx] = newDoc
        } else {
          directors[directorIndex].documents.push(newDoc)
        }

        if (typedDoc === "pan") {
          directors[directorIndex].panData = undefined
          directors[directorIndex].validated = false
          setEditedPan((prev) => {
            const next = { ...prev }
            delete next[directorIndex]
            return next
          })
        }
        if (typedDoc === "aadhaar") {
          directors[directorIndex].aadhaarData = undefined
          directors[directorIndex].validated = false
          setEditedAadhaar((prev) => {
            const next = { ...prev }
            delete next[directorIndex]
            return next
          })
        }

        await updateCase({ directors, status: "draft" })

        if (coreKey) {
          setStatusOverrides((prev) => ({ ...prev, [coreKey]: "pending" }))
          setProgressDetails((prev) => ({
            ...prev,
            [coreKey]: { status: "queued", message: "Uploaded. Starting extraction..." },
          }))
          if (typedDoc === "pan" || typedDoc === "aadhaar") {
            setActiveReviewDoc((prev) => {
              const next: [ReviewDocType, ReviewDocType] = [prev[0], prev[1]]
              next[directorIndex] = typedDoc
              return next
            })
          }
        }

        await mutate()

        if (typedDoc === "pan" || typedDoc === "aadhaar") {
          await extractSingleDocument(directorIndex, typedDoc, contentBase64)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "File upload failed"
        setErrorMessage(message)
        if (coreKey) {
          setStatusOverrides((prev) => ({ ...prev, [coreKey]: "error" }))
          setProgressDetails((prev) => ({
            ...prev,
            [coreKey]: { status: "error", message },
          }))
        }
      } finally {
        if (coreKey) {
          setUploadingKeys((prev) => {
            const next = { ...prev }
            delete next[coreKey]
            return next
          })
        }
      }
    },
    [caseData, extractSingleDocument, mutate, updateCase]
  )

  const handleRemove = useCallback(
    async (docType: DirectorDocument["type"], directorIndex: number) => {
      if (!caseData || batchProcessing) return

      const coreKey =
        docType === "pan" || docType === "aadhaar"
          ? keyFor(directorIndex, docType)
          : undefined

      setErrorMessage("")
      try {
        const directors = cloneDirectors(caseData)
        directors[directorIndex].documents = directors[directorIndex].documents.filter(
          (doc) => doc.type !== docType
        )

        if (docType === "pan") {
          directors[directorIndex].panData = undefined
          directors[directorIndex].validated = false
          setEditedPan((prev) => {
            const next = { ...prev }
            delete next[directorIndex]
            return next
          })
        }
        if (docType === "aadhaar") {
          directors[directorIndex].aadhaarData = undefined
          directors[directorIndex].validated = false
          setEditedAadhaar((prev) => {
            const next = { ...prev }
            delete next[directorIndex]
            return next
          })
        }

        await updateCase({ directors, status: "draft" })
        await mutate()

        if (coreKey) {
          setStatusOverrides((prev) => {
            const next = { ...prev }
            delete next[coreKey]
            return next
          })
          setProgressDetails((prev) => {
            const next = { ...prev }
            delete next[coreKey]
            return next
          })
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to remove file")
      }
    },
    [batchProcessing, caseData, mutate, updateCase]
  )

  const handleProcessAll = useCallback(async () => {
    if (!caseData) return
    setBatchProcessing(true)
    setErrorMessage("")

    try {
      const tasks: Array<{ directorIndex: number; documentType: "pan" | "aadhaar" }> = []
      for (let dirIdx = 0; dirIdx < 2; dirIdx++) {
        for (const docType of CORE_DOC_TYPES) {
          const doc = caseData.directors[dirIdx].documents.find((item) => item.type === docType)
          if (doc?.contentBase64) {
            tasks.push({ directorIndex: dirIdx, documentType: docType })
          }
        }
      }

      if (tasks.length === 0) {
        setErrorMessage("Upload PAN/Aadhaar files first. No processable documents found.")
        return
      }

      const results = await Promise.allSettled(
        tasks.map((task) => extractSingleDocument(task.directorIndex, task.documentType))
      )
      const failed = results.filter(
        (result) => result.status === "rejected" || result.value === false
      ).length
      if (failed > 0) {
        setErrorMessage(
          `${failed} document${failed > 1 ? "s" : ""} failed. Check item progress below.`
        )
      }
    } finally {
      setBatchProcessing(false)
    }
  }, [caseData, extractSingleDocument])

  const updatePanField = useCallback(
    (directorIndex: number, field: keyof PanData, value: string) => {
      if (!caseData) return
      const baseline = caseData.directors[directorIndex].panData ?? emptyPanData()
      setEditedPan((prev) => ({
        ...prev,
        [directorIndex]: {
          ...(prev[directorIndex] ?? baseline),
          [field]: value,
        },
      }))
    },
    [caseData]
  )

  const updateAadhaarField = useCallback(
    (directorIndex: number, field: keyof AadhaarData, value: string) => {
      if (!caseData) return
      const baseline = caseData.directors[directorIndex].aadhaarData ?? emptyAadhaarData()
      setEditedAadhaar((prev) => ({
        ...prev,
        [directorIndex]: {
          ...(prev[directorIndex] ?? baseline),
          [field]: value,
        },
      }))
    },
    [caseData]
  )

  const handleApproveDirector = useCallback(
    async (directorIndex: number) => {
      if (!caseData) return

      const hasPan = Boolean(caseData.directors[directorIndex].panData || editedPan[directorIndex])
      const hasAadhaar = Boolean(
        caseData.directors[directorIndex].aadhaarData || editedAadhaar[directorIndex]
      )
      if (!hasPan || !hasAadhaar) {
        setErrorMessage("Both PAN and Aadhaar extraction are required before approval.")
        return
      }

      setErrorMessage("")
      setApprovingDirector((prev) => {
        const next: [boolean, boolean] = [prev[0], prev[1]]
        next[directorIndex] = true
        return next
      })

      try {
        const directors = cloneDirectors(caseData)
        if (editedPan[directorIndex]) {
          directors[directorIndex].panData = editedPan[directorIndex]
        }
        if (editedAadhaar[directorIndex]) {
          directors[directorIndex].aadhaarData = editedAadhaar[directorIndex]
        }
        directors[directorIndex].validated = true

        const allValidated = directors.every((director) => director.validated)

        await updateCase({
          directors,
          status: allValidated ? "complete" : "reviewing",
        })
        await mutate()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to approve director")
      } finally {
        setApprovingDirector((prev) => {
          const next: [boolean, boolean] = [prev[0], prev[1]]
          next[directorIndex] = false
          return next
        })
      }
    },
    [caseData, editedAadhaar, editedPan, mutate, updateCase]
  )

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getDoc = (dirIdx: number, docType: DirectorDocument["type"]) =>
    caseData.directors[dirIdx].documents.find((doc) => doc.type === docType)

  const getDisplayStatus = (
    dirIdx: number,
    docType: DirectorDocument["type"],
    fallback?: DirectorDocument["status"]
  ): DirectorDocument["status"] => {
    if (docType !== "pan" && docType !== "aadhaar") return fallback ?? "pending"
    const key = keyFor(dirIdx, docType)
    if (uploadingKeys[key]) return "processing"
    return statusOverrides[key] ?? fallback ?? "pending"
  }

  const uploadedCoreDocs = [0, 1].reduce((sum, dirIdx) => {
    return (
      sum +
      CORE_DOC_TYPES.filter((docType) => Boolean(getDoc(dirIdx, docType)?.contentBase64)).length
    )
  }, 0)

  const totalCoreDocs = 4
  const uploadReadyPct = Math.round((uploadedCoreDocs / totalCoreDocs) * 100)
  const hasProcessableDocuments = uploadedCoreDocs > 0
  const currentlyUploading = Object.keys(uploadingKeys).length > 0

  const completedCount = [0, 1].reduce((sum, dirIdx) => {
    return (
      sum +
      CORE_DOC_TYPES.filter((docType) => {
        const status = getDisplayStatus(dirIdx, docType, getDoc(dirIdx, docType)?.status)
        return status === "done"
      }).length
    )
  }, 0)

  const extractionPct = totalCoreDocs > 0 ? Math.round((completedCount / totalCoreDocs) * 100) : 0
  const allValidated = caseData.directors.every((director) => director.validated)

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">{caseData.name}</h1>
                <StatusBadge status={caseData.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Upload documents. PAN/Aadhaar extraction starts automatically.
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
            Modal GPU
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Upload Readiness</span>
                <span className="font-mono text-muted-foreground">
                  {uploadedCoreDocs}/{totalCoreDocs}
                </span>
              </div>
              <Progress value={uploadReadyPct} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Extraction Completion</span>
                <span className="font-mono text-muted-foreground">
                  {completedCount}/{totalCoreDocs}
                </span>
              </div>
              <Progress value={extractionPct} />
            </div>
            <p className="text-xs text-muted-foreground">
              PDFs are converted to image for extraction. Large images are resized and
              contrast-enhanced automatically.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="director-0" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="director-0" className="flex-1 sm:flex-none">
              Director 1
            </TabsTrigger>
            <TabsTrigger value="director-1" className="flex-1 sm:flex-none">
              Director 2
            </TabsTrigger>
          </TabsList>

          {[0, 1].map((dirIdx) => {
            const preferredReviewType = activeReviewDoc[dirIdx]
            const fallbackReviewType: ReviewDocType =
              preferredReviewType === "pan" ? "aadhaar" : "pan"
            const selectedReviewType = getDoc(dirIdx, preferredReviewType)
              ? preferredReviewType
              : fallbackReviewType

            const reviewDoc = getDoc(dirIdx, selectedReviewType)
            const panData = editedPan[dirIdx] ?? caseData.directors[dirIdx].panData ?? emptyPanData()
            const aadhaarData =
              editedAadhaar[dirIdx] ?? caseData.directors[dirIdx].aadhaarData ?? emptyAadhaarData()

            const hasPanExtracted = Boolean(caseData.directors[dirIdx].panData || editedPan[dirIdx])
            const hasAadhaarExtracted = Boolean(
              caseData.directors[dirIdx].aadhaarData || editedAadhaar[dirIdx]
            )

            const nameMismatch =
              panData.name.trim().length > 0 &&
              aadhaarData.name.trim().length > 0 &&
              panData.name.trim().toUpperCase() !== aadhaarData.name.trim().toUpperCase()

            const canApprove = hasPanExtracted && hasAadhaarExtracted

            return (
              <TabsContent key={dirIdx} value={`director-${dirIdx}`}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Director {dirIdx + 1} Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <UploadZone
                        label="PAN Card"
                        accept=".jpg,.jpeg,.png,.pdf"
                        docType="pan"
                        file={
                          getDoc(dirIdx, "pan")
                            ? {
                                name: getDoc(dirIdx, "pan")!.fileName,
                                type: "pan",
                                url: getDoc(dirIdx, "pan")!.fileUrl,
                                status: getDisplayStatus(
                                  dirIdx,
                                  "pan",
                                  getDoc(dirIdx, "pan")!.status
                                ),
                              }
                            : uploadingKeys[keyFor(dirIdx, "pan")]
                              ? {
                                  name: uploadingKeys[keyFor(dirIdx, "pan")],
                                  type: "pan",
                                  url: "",
                                  status: "processing",
                                }
                              : null
                        }
                        onFileSelect={(file, docType) => handleFileSelect(file, docType, dirIdx)}
                        onRemove={() => handleRemove("pan", dirIdx)}
                      />
                      <UploadZone
                        label="Aadhaar Card"
                        accept=".jpg,.jpeg,.png,.pdf"
                        docType="aadhaar"
                        file={
                          getDoc(dirIdx, "aadhaar")
                            ? {
                                name: getDoc(dirIdx, "aadhaar")!.fileName,
                                type: "aadhaar",
                                url: getDoc(dirIdx, "aadhaar")!.fileUrl,
                                status: getDisplayStatus(
                                  dirIdx,
                                  "aadhaar",
                                  getDoc(dirIdx, "aadhaar")!.status
                                ),
                              }
                            : uploadingKeys[keyFor(dirIdx, "aadhaar")]
                              ? {
                                  name: uploadingKeys[keyFor(dirIdx, "aadhaar")],
                                  type: "aadhaar",
                                  url: "",
                                  status: "processing",
                                }
                              : null
                        }
                        onFileSelect={(file, docType) => handleFileSelect(file, docType, dirIdx)}
                        onRemove={() => handleRemove("aadhaar", dirIdx)}
                      />
                      <UploadZone
                        label="Photo (JPEG)"
                        accept=".jpg,.jpeg,.png"
                        docType="photo"
                        file={
                          getDoc(dirIdx, "photo")
                            ? {
                                name: getDoc(dirIdx, "photo")!.fileName,
                                type: "photo",
                                url: getDoc(dirIdx, "photo")!.fileUrl,
                                status: getDoc(dirIdx, "photo")!.status,
                              }
                            : null
                        }
                        onFileSelect={(file, docType) => handleFileSelect(file, docType, dirIdx)}
                        onRemove={() => handleRemove("photo", dirIdx)}
                      />
                      <UploadZone
                        label="Signature (PDF)"
                        accept=".pdf"
                        docType="signature"
                        file={
                          getDoc(dirIdx, "signature")
                            ? {
                                name: getDoc(dirIdx, "signature")!.fileName,
                                type: "signature",
                                url: getDoc(dirIdx, "signature")!.fileUrl,
                                status: getDoc(dirIdx, "signature")!.status,
                              }
                            : null
                        }
                        onFileSelect={(file, docType) => handleFileSelect(file, docType, dirIdx)}
                        onRemove={() => handleRemove("signature", dirIdx)}
                      />
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                      {CORE_DOC_TYPES.map((docType) => {
                        const key = keyFor(dirIdx, docType)
                        const detail = progressDetails[key]
                        const status: ProcessStatus =
                          detail?.status ??
                          (getDisplayStatus(dirIdx, docType, getDoc(dirIdx, docType)?.status) ===
                          "error"
                            ? "error"
                            : getDisplayStatus(dirIdx, docType, getDoc(dirIdx, docType)?.status) ===
                                  "done"
                              ? "done"
                              : "queued")

                        return (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{docType.toUpperCase()}</span>
                            <span className="flex items-center gap-2 text-muted-foreground">
                              {statusIcon(status)}
                              <span>
                                {detail?.message ??
                                  (status === "queued" ? "Waiting for upload" : status)}
                              </span>
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {(hasPanExtracted || hasAadhaarExtracted || reviewDoc) && (
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              In-Place Verification
                            </h3>
                            {caseData.directors[dirIdx].validated ? (
                              <Badge variant="default">Approved</Badge>
                            ) : (
                              <Badge variant="outline">Pending Approval</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={selectedReviewType === "pan" ? "default" : "outline"}
                              size="sm"
                              disabled={!getDoc(dirIdx, "pan")}
                              onClick={() =>
                                setActiveReviewDoc((prev) => {
                                  const next: [ReviewDocType, ReviewDocType] = [prev[0], prev[1]]
                                  next[dirIdx] = "pan"
                                  return next
                                })
                              }
                            >
                              PAN
                            </Button>
                            <Button
                              type="button"
                              variant={selectedReviewType === "aadhaar" ? "default" : "outline"}
                              size="sm"
                              disabled={!getDoc(dirIdx, "aadhaar")}
                              onClick={() =>
                                setActiveReviewDoc((prev) => {
                                  const next: [ReviewDocType, ReviewDocType] = [prev[0], prev[1]]
                                  next[dirIdx] = "aadhaar"
                                  return next
                                })
                              }
                            >
                              Aadhaar
                            </Button>
                          </div>
                        </div>

                        {nameMismatch && (
                          <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground">
                            Name mismatch detected. PAN and Aadhaar names should be reviewed before approval.
                          </div>
                        )}

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">
                                Document Preview ({selectedReviewType.toUpperCase()})
                              </p>
                              {reviewDoc?.fileUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setPreviewTarget({
                                      title: `Director ${dirIdx + 1} ${selectedReviewType.toUpperCase()}`,
                                      fileUrl: reviewDoc.fileUrl,
                                      isPdf: isPdfDocument(reviewDoc),
                                    })
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                  Open
                                </Button>
                              )}
                            </div>

                            <div className="flex min-h-[380px] items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
                              {!reviewDoc?.fileUrl && (
                                <p className="text-xs text-muted-foreground">
                                  Upload {selectedReviewType.toUpperCase()} to preview.
                                </p>
                              )}
                              {reviewDoc?.fileUrl && isImageDocument(reviewDoc) && (
                                <img
                                  src={reviewDoc.fileUrl}
                                  alt={`${selectedReviewType} preview`}
                                  className="max-h-[360px] w-full rounded object-contain"
                                />
                              )}
                              {reviewDoc?.fileUrl && isPdfDocument(reviewDoc) && (
                                <iframe
                                  src={reviewDoc.fileUrl}
                                  title={`${selectedReviewType} pdf preview`}
                                  className="h-[360px] w-full rounded border-0"
                                />
                              )}
                              {reviewDoc?.fileUrl &&
                                !isImageDocument(reviewDoc) &&
                                !isPdfDocument(reviewDoc) && (
                                  <p className="text-xs text-muted-foreground">
                                    Preview not available for this file type.
                                  </p>
                                )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {selectedReviewType === "pan" ? (
                              <>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`pan-name-${dirIdx}`}>Name (PAN)</Label>
                                  <Input
                                    id={`pan-name-${dirIdx}`}
                                    value={panData.name}
                                    onChange={(e) =>
                                      updatePanField(dirIdx, "name", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`pan-father-${dirIdx}`}>Father&apos;s Name</Label>
                                  <Input
                                    id={`pan-father-${dirIdx}`}
                                    value={panData.fathers_name}
                                    onChange={(e) =>
                                      updatePanField(dirIdx, "fathers_name", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`pan-dob-${dirIdx}`}>Date of Birth</Label>
                                  <Input
                                    id={`pan-dob-${dirIdx}`}
                                    value={panData.date_of_birth}
                                    onChange={(e) =>
                                      updatePanField(dirIdx, "date_of_birth", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`pan-number-${dirIdx}`}>PAN Number</Label>
                                  <Input
                                    id={`pan-number-${dirIdx}`}
                                    value={panData.pan_number}
                                    onChange={(e) =>
                                      updatePanField(
                                        dirIdx,
                                        "pan_number",
                                        e.target.value.toUpperCase()
                                      )
                                    }
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`aadhaar-name-${dirIdx}`}>Name (Aadhaar)</Label>
                                  <Input
                                    id={`aadhaar-name-${dirIdx}`}
                                    value={aadhaarData.name}
                                    onChange={(e) =>
                                      updateAadhaarField(dirIdx, "name", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`aadhaar-number-${dirIdx}`}>Aadhaar Number</Label>
                                  <Input
                                    id={`aadhaar-number-${dirIdx}`}
                                    value={aadhaarData.aadhaar_number}
                                    onChange={(e) =>
                                      updateAadhaarField(
                                        dirIdx,
                                        "aadhaar_number",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`aadhaar-dob-${dirIdx}`}>Date of Birth</Label>
                                  <Input
                                    id={`aadhaar-dob-${dirIdx}`}
                                    value={aadhaarData.date_of_birth}
                                    onChange={(e) =>
                                      updateAadhaarField(
                                        dirIdx,
                                        "date_of_birth",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`aadhaar-gender-${dirIdx}`}>Gender</Label>
                                  <Input
                                    id={`aadhaar-gender-${dirIdx}`}
                                    value={aadhaarData.gender}
                                    onChange={(e) =>
                                      updateAadhaarField(dirIdx, "gender", e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`aadhaar-address-${dirIdx}`}>Address</Label>
                                  <Textarea
                                    id={`aadhaar-address-${dirIdx}`}
                                    value={aadhaarData.address}
                                    onChange={(e) =>
                                      updateAadhaarField(dirIdx, "address", e.target.value)
                                    }
                                    rows={4}
                                  />
                                </div>
                              </>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!reviewDoc?.contentBase64}
                                onClick={() => extractSingleDocument(dirIdx, selectedReviewType)}
                              >
                                {selectedReviewType === "pan" ? "Re-extract PAN" : "Re-extract Aadhaar"}
                              </Button>
                              <Button
                                type="button"
                                disabled={approvingDirector[dirIdx] || !canApprove}
                                onClick={() => handleApproveDirector(dirIdx)}
                              >
                                {approvingDirector[dirIdx] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4" />
                                    Approve Director {dirIdx + 1}
                                  </>
                                )}
                              </Button>
                            </div>
                            {!canApprove && (
                              <p className="text-xs text-muted-foreground">
                                Extract PAN and Aadhaar for this director before approval.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Verify extracted fields directly here. No separate review step required.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleProcessAll}
              disabled={!hasProcessableDocuments || batchProcessing || currentlyUploading}
            >
              {batchProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reprocessing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Reprocess Uploaded Docs
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/case/${caseId}/manual`)}
              disabled={!allValidated}
            >
              <ArrowRight className="h-4 w-4" />
              Continue to Manual Fields
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(previewTarget)} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewTarget?.title ?? "Document Preview"}</DialogTitle>
            <DialogDescription>
              In-place preview supports both image and PDF documents.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-hidden rounded-md border bg-muted/30">
            {previewTarget?.fileUrl && previewTarget.isPdf ? (
              <iframe
                src={previewTarget.fileUrl}
                title={previewTarget.title}
                className="h-[75vh] w-full border-0"
              />
            ) : previewTarget?.fileUrl ? (
              <img
                src={previewTarget.fileUrl}
                alt={previewTarget.title}
                className="max-h-[75vh] w-full object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
