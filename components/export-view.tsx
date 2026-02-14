"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  Download,
  Loader2,
  Check,
  FileSpreadsheet,
  User,
  Building2,
  Briefcase,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { Case } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ExportViewProps {
  caseId: string
}

interface ExportResponse {
  fileName: string
  fieldsFilled: number
  totalFields: number
  fileContentBase64?: string
  error?: string
}

interface FieldRow {
  label: string
  director1: string
  director2: string
  source: "AI" | "Manual" | "Default"
}

function getFieldRows(caseData: Case): FieldRow[] {
  const d1 = caseData.directors[0]
  const d2 = caseData.directors[1]

  return [
    {
      label: "Name (PAN)",
      director1: d1.panData?.name ?? "-",
      director2: d2.panData?.name ?? "-",
      source: "AI",
    },
    {
      label: "Father's Name",
      director1: d1.panData?.fathers_name ?? "-",
      director2: d2.panData?.fathers_name ?? "-",
      source: "AI",
    },
    {
      label: "Date of Birth",
      director1: d1.panData?.date_of_birth ?? "-",
      director2: d2.panData?.date_of_birth ?? "-",
      source: "AI",
    },
    {
      label: "Place of Birth",
      director1: d1.placeOfBirth || "-",
      director2: d2.placeOfBirth || "-",
      source: "Manual",
    },
    {
      label: "Nationality",
      director1: d1.nationality || "Indian",
      director2: d2.nationality || "Indian",
      source: "Default",
    },
    {
      label: "Resident of India",
      director1: d1.residentOfIndia || "Yes",
      director2: d2.residentOfIndia || "Yes",
      source: "Default",
    },
    {
      label: "Occupation",
      director1: d1.occupation || "-",
      director2: d2.occupation || "-",
      source: "Manual",
    },
    {
      label: "Education",
      director1: d1.education || "-",
      director2: d2.education || "-",
      source: "Manual",
    },
    {
      label: "Shares Subscribed",
      director1: d1.sharesSubscribed || "-",
      director2: d2.sharesSubscribed || "-",
      source: "Manual",
    },
    {
      label: "Duration at Address",
      director1: d1.durationAtAddress || "-",
      director2: d2.durationAtAddress || "-",
      source: "Manual",
    },
    {
      label: "Email",
      director1: d1.email || "-",
      director2: d2.email || "-",
      source: "Manual",
    },
    {
      label: "Mobile",
      director1: d1.mobile || "-",
      director2: d2.mobile || "-",
      source: "Manual",
    },
    {
      label: "PAN Number",
      director1: d1.panData?.pan_number ?? "-",
      director2: d2.panData?.pan_number ?? "-",
      source: "AI",
    },
    {
      label: "Aadhaar Number",
      director1: d1.aadhaarData?.aadhaar_number
        ? `AADHAR - ${d1.aadhaarData.aadhaar_number}`
        : "-",
      director2: d2.aadhaarData?.aadhaar_number
        ? `AADHAR - ${d2.aadhaarData.aadhaar_number}`
        : "-",
      source: "AI",
    },
    {
      label: "Address",
      director1: d1.aadhaarData?.address ?? "-",
      director2: d2.aadhaarData?.address ?? "-",
      source: "AI",
    },
    {
      label: "DIN Number",
      director1: d1.dinNumber || "-",
      director2: d2.dinNumber || "-",
      source: "Manual",
    },
  ]
}

function countFilled(rows: FieldRow[]): number {
  let count = 0
  for (const row of rows) {
    if (row.director1 !== "-") count++
    if (row.director2 !== "-") count++
  }
  return count
}

export function ExportView({ caseId }: ExportViewProps) {
  const { data: caseData } = useSWR<Case>(`/api/cases/${caseId}`, fetcher)
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [result, setResult] = useState<ExportResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const fieldRows = getFieldRows(caseData)
  const filled = countFilled(fieldRows)
  const total = fieldRows.length * 2
  const percentage = Math.round((filled / total) * 100)

  function downloadExcel(fileName: string, fileContentBase64?: string) {
    if (!fileContentBase64) return
    const binary = atob(fileContentBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function handleGenerate() {
    setGenerating(true)
    setErrorMessage("")
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      })
      const data = (await res.json()) as ExportResponse
      if (!res.ok) {
        throw new Error(data.error ?? "Excel generation failed")
      }
      setResult(data)
      setGenerated(true)
      downloadExcel(data.fileName, data.fileContentBase64)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/case/${caseId}/manual`)}
            aria-label="Back to manual fields"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Export Checklist
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {caseData.name} - Review and download
            </p>
          </div>
        </div>
      </div>

      {/* Completion Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Director Fields
              </p>
              <p className="text-xs text-muted-foreground">
                {filled} / {total} filled
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Company Info
              </p>
              <p className="text-xs text-muted-foreground">
                {[
                  caseData.companyInfo.officeEmail,
                  caseData.companyInfo.officeMobile,
                  caseData.companyInfo.authorizedShareCapital,
                  caseData.companyInfo.paidUpShareCapital,
                ].filter(Boolean).length}{" "}
                / 4 filled
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Professional
              </p>
              <p className="text-xs text-muted-foreground">
                {[
                  caseData.professionalInfo.name,
                  caseData.professionalInfo.membershipNo,
                  caseData.professionalInfo.address,
                ].filter(Boolean).length}{" "}
                / 3 filled
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Overall Completion
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {percentage}%
            </span>
          </div>
          <Progress value={percentage} />
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Field Summary</CardTitle>
          <CardDescription>
            All populated fields with their data source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Field
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Director 1
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Director 2
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fieldRows.map((row) => (
                  <tr key={row.label} className="text-sm">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.label}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {row.director1}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {row.director2}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          row.source === "AI"
                            ? "default"
                            : row.source === "Default"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {row.source}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Generate/Download Section */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          {generated && result ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <Check className="h-7 w-7 text-success" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-medium text-foreground">
                  Excel Generated
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.fileName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.fieldsFilled} / {result.totalFields} fields populated
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  onClick={() =>
                    downloadExcel(result.fileName, result.fileContentBase64)
                  }
                >
                  <Download className="h-4 w-4" />
                  Download .xlsx
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGenerated(false)
                    setResult(null)
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-medium text-foreground">
                  Generate Checklist
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Populate the Company Formation Excel template with all
                  collected data
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                size="lg"
                className="mt-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    Generate & Download Excel
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Separator />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/case/${caseId}/manual`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Edit
        </Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  )
}
