"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  Cpu,
  Server,
  Play,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/status-badge"
import { UploadZone } from "@/components/upload-zone"
import type { Case, DirectorDocument } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface CaseViewProps {
  caseId: string
}

export function CaseView({ caseId }: CaseViewProps) {
  const { data: caseData, mutate } = useSWR<Case>(
    `/api/cases/${caseId}`,
    fetcher
  )
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [inferenceMode, setInferenceMode] = useState<"modal" | "cpu">("modal")
  const [localFiles, setLocalFiles] = useState<
    Record<string, { name: string; file: File }>
  >({})

  const handleFileSelect = useCallback(
    (file: File, docType: string, directorIndex: number) => {
      const key = `${directorIndex}-${docType}`
      setLocalFiles((prev) => ({ ...prev, [key]: { name: file.name, file } }))

      // Also update the case via API with the document entry
      if (caseData) {
        const directors = [...caseData.directors] as Case["directors"]
        const newDoc: DirectorDocument = {
          id: `doc-${Date.now()}`,
          type: docType as DirectorDocument["type"],
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          status: "pending",
        }

        // Replace existing doc of same type or add new
        const existingIdx = directors[directorIndex].documents.findIndex(
          (d) => d.type === docType
        )
        if (existingIdx >= 0) {
          directors[directorIndex].documents[existingIdx] = newDoc
        } else {
          directors[directorIndex].documents.push(newDoc)
        }

        fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directors }),
        }).then(() => mutate())
      }
    },
    [caseData, caseId, mutate]
  )

  const handleProcessAll = useCallback(async () => {
    if (!caseData) return
    setProcessing(true)

    try {
      // Process each director's documents
      for (let dirIdx = 0; dirIdx < 2; dirIdx++) {
        const docs = caseData.directors[dirIdx].documents
        for (const doc of docs) {
          if (doc.type === "pan" || doc.type === "aadhaar") {
            await fetch("/api/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caseId,
                directorIndex: dirIdx,
                documentType: doc.type,
              }),
            })
          }
        }
      }
      await mutate()
    } finally {
      setProcessing(false)
    }
  }, [caseData, caseId, mutate])

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasDocuments =
    caseData.directors[0].documents.length > 0 ||
    caseData.directors[1].documents.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
              <h1 className="text-xl font-semibold text-foreground">
                {caseData.name}
              </h1>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload PAN and Aadhaar documents for each director
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Inference mode toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-1">
            <button
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                inferenceMode === "modal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setInferenceMode("modal")}
            >
              <Server className="h-3.5 w-3.5" />
              Modal GPU
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                inferenceMode === "cpu"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setInferenceMode("cpu")}
            >
              <Cpu className="h-3.5 w-3.5" />
              Local CPU
            </button>
          </div>
        </div>
      </div>

      {/* Director Tabs */}
      <Tabs defaultValue="director-0" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="director-0" className="flex-1 sm:flex-none">
            Director 1
          </TabsTrigger>
          <TabsTrigger value="director-1" className="flex-1 sm:flex-none">
            Director 2
          </TabsTrigger>
        </TabsList>

        {[0, 1].map((dirIdx) => (
          <TabsContent key={dirIdx} value={`director-${dirIdx}`}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Director {dirIdx + 1} Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <UploadZone
                    label="PAN Card"
                    accept=".jpg,.jpeg,.png,.pdf"
                    docType="pan"
                    file={
                      caseData.directors[dirIdx].documents.find(
                        (d) => d.type === "pan"
                      )
                        ? {
                            name:
                              caseData.directors[dirIdx].documents.find(
                                (d) => d.type === "pan"
                              )!.fileName,
                            type: "pan",
                            url: "",
                            status: caseData.directors[dirIdx].documents.find(
                              (d) => d.type === "pan"
                            )!.status,
                          }
                        : localFiles[`${dirIdx}-pan`]
                          ? {
                              name: localFiles[`${dirIdx}-pan`].name,
                              type: "pan",
                              url: "",
                              status: "pending",
                            }
                          : null
                    }
                    onFileSelect={(file, docType) =>
                      handleFileSelect(file, docType, dirIdx)
                    }
                    onRemove={() => {
                      setLocalFiles((prev) => {
                        const next = { ...prev }
                        delete next[`${dirIdx}-pan`]
                        return next
                      })
                    }}
                  />
                  <UploadZone
                    label="Aadhaar Card"
                    accept=".jpg,.jpeg,.png,.pdf"
                    docType="aadhaar"
                    file={
                      caseData.directors[dirIdx].documents.find(
                        (d) => d.type === "aadhaar"
                      )
                        ? {
                            name:
                              caseData.directors[dirIdx].documents.find(
                                (d) => d.type === "aadhaar"
                              )!.fileName,
                            type: "aadhaar",
                            url: "",
                            status: caseData.directors[dirIdx].documents.find(
                              (d) => d.type === "aadhaar"
                            )!.status,
                          }
                        : localFiles[`${dirIdx}-aadhaar`]
                          ? {
                              name: localFiles[`${dirIdx}-aadhaar`].name,
                              type: "aadhaar",
                              url: "",
                              status: "pending",
                            }
                          : null
                    }
                    onFileSelect={(file, docType) =>
                      handleFileSelect(file, docType, dirIdx)
                    }
                    onRemove={() => {
                      setLocalFiles((prev) => {
                        const next = { ...prev }
                        delete next[`${dirIdx}-aadhaar`]
                        return next
                      })
                    }}
                  />
                  <UploadZone
                    label="Photo (JPEG)"
                    accept=".jpg,.jpeg,.png"
                    docType="photo"
                    file={
                      localFiles[`${dirIdx}-photo`]
                        ? {
                            name: localFiles[`${dirIdx}-photo`].name,
                            type: "photo",
                            url: "",
                            status: "pending",
                          }
                        : null
                    }
                    onFileSelect={(file, docType) =>
                      handleFileSelect(file, docType, dirIdx)
                    }
                  />
                  <UploadZone
                    label="Signature (PDF)"
                    accept=".pdf"
                    docType="signature"
                    file={
                      localFiles[`${dirIdx}-signature`]
                        ? {
                            name: localFiles[`${dirIdx}-signature`].name,
                            type: "signature",
                            url: "",
                            status: "pending",
                          }
                        : null
                    }
                    onFileSelect={(file, docType) =>
                      handleFileSelect(file, docType, dirIdx)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {inferenceMode === "modal"
            ? "Using Modal T4 GPU (fast, ~18s per document)"
            : "Using Local CPU (slow, ~80s per document)"}
        </p>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleProcessAll}
            disabled={!hasDocuments || processing}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Process All Documents
              </>
            )}
          </Button>
          {(caseData.status === "reviewing" ||
            caseData.status === "complete") && (
            <Button
              variant="outline"
              onClick={() => router.push(`/case/${caseId}/review`)}
            >
              Review Extracted Data
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
