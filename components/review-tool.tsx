"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  RefreshCw,
  FileText,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { Case, PanData, AadhaarData } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ReviewToolProps {
  caseId: string
}

export function ReviewTool({ caseId }: ReviewToolProps) {
  const { data: caseData, mutate } = useSWR<Case>(
    `/api/cases/${caseId}`,
    fetcher
  )
  const router = useRouter()
  const [activeDirector, setActiveDirector] = useState(0)
  const [activeDoc, setActiveDoc] = useState<"pan" | "aadhaar">("pan")
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [reextracting, setReextracting] = useState(false)
  const [editedPan, setEditedPan] = useState<Record<number, PanData>>({})
  const [editedAadhaar, setEditedAadhaar] = useState<
    Record<number, AadhaarData>
  >({})

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const director = caseData.directors[activeDirector]
  const panData = editedPan[activeDirector] ?? director.panData
  const aadhaarData = editedAadhaar[activeDirector] ?? director.aadhaarData

  // Check name mismatch
  const nameMismatch =
    panData &&
    aadhaarData &&
    panData.name.toUpperCase().trim() !==
      aadhaarData.name.toUpperCase().trim()

  const allValidated =
    caseData.directors[0].validated && caseData.directors[1].validated

  async function handleConfirm() {
    const directors = [...caseData!.directors] as Case["directors"]
    if (editedPan[activeDirector]) {
      directors[activeDirector].panData = editedPan[activeDirector]
    }
    if (editedAadhaar[activeDirector]) {
      directors[activeDirector].aadhaarData = editedAadhaar[activeDirector]
    }
    directors[activeDirector].validated = true

    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directors }),
    })
    await mutate()
  }

  async function handleReextract() {
    setReextracting(true)
    try {
      await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          directorIndex: activeDirector,
          documentType: activeDoc,
        }),
      })
      await mutate()
    } finally {
      setReextracting(false)
    }
  }

  function updatePanField(field: keyof PanData, value: string) {
    setEditedPan((prev) => ({
      ...prev,
      [activeDirector]: {
        ...(prev[activeDirector] ?? director.panData ?? ({} as PanData)),
        [field]: value,
      },
    }))
  }

  function updateAadhaarField(field: keyof AadhaarData, value: string) {
    setEditedAadhaar((prev) => ({
      ...prev,
      [activeDirector]: {
        ...(prev[activeDirector] ??
          director.aadhaarData ??
          ({} as AadhaarData)),
        [field]: value,
      },
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/case/${caseId}`)}
            aria-label="Back to case view"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Review Extracted Data
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {caseData.name} - Verify AI-extracted fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReextract}
            disabled={reextracting}
          >
            {reextracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-extract
          </Button>
          <Button onClick={handleConfirm} disabled={director.validated}>
            <Check className="h-4 w-4" />
            {director.validated ? "Confirmed" : "Confirm Director"}
          </Button>
        </div>
      </div>

      {/* Name mismatch warning */}
      {nameMismatch && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Name Mismatch Detected
            </p>
            <p className="text-xs text-muted-foreground">
              PAN: {panData?.name} | Aadhaar: {aadhaarData?.name}
            </p>
          </div>
        </div>
      )}

      {/* Director Tabs */}
      <Tabs
        value={`director-${activeDirector}`}
        onValueChange={(v) => {
          setActiveDirector(Number(v.replace("director-", "")))
          setZoom(1)
          setRotation(0)
        }}
      >
        <TabsList>
          <TabsTrigger value="director-0" className="gap-2">
            Director 1
            {caseData.directors[0].validated && (
              <Check className="h-3.5 w-3.5 text-success" />
            )}
          </TabsTrigger>
          <TabsTrigger value="director-1" className="gap-2">
            Director 2
            {caseData.directors[1].validated && (
              <Check className="h-3.5 w-3.5 text-success" />
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Split Pane */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Document Viewer */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <button
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeDoc === "pan"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveDoc("pan")}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  PAN Card
                </button>
                <button
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeDoc === "aadhaar"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveDoc("aadhaar")}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Aadhaar
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center rounded-lg bg-muted/50 min-h-[400px] overflow-hidden">
                <div
                  className="flex flex-col items-center justify-center gap-3 p-8 text-center"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease",
                  }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
                    {activeDoc === "pan" ? (
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeDoc === "pan" ? "PAN Card" : "Aadhaar Card"} Preview
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Document image will appear here after upload
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Extracted Fields */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Extracted Fields</CardTitle>
              <CardDescription>
                {activeDoc === "pan"
                  ? "Fields from PAN card"
                  : "Fields from Aadhaar card"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeDoc === "pan" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pan-name" className="flex items-center gap-2">
                      Name
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="pan-name"
                      value={panData?.name ?? ""}
                      onChange={(e) => updatePanField("name", e.target.value)}
                      placeholder="Not extracted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="pan-father"
                      className="flex items-center gap-2"
                    >
                      {"Father's Name"}
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="pan-father"
                      value={panData?.fathers_name ?? ""}
                      onChange={(e) =>
                        updatePanField("fathers_name", e.target.value)
                      }
                      placeholder="Not extracted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pan-dob" className="flex items-center gap-2">
                      Date of Birth
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="pan-dob"
                      value={panData?.date_of_birth ?? ""}
                      onChange={(e) =>
                        updatePanField("date_of_birth", e.target.value)
                      }
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pan-num" className="flex items-center gap-2">
                      PAN Number
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="pan-num"
                      value={panData?.pan_number ?? ""}
                      onChange={(e) =>
                        updatePanField("pan_number", e.target.value)
                      }
                      placeholder="ABCDE1234F"
                      className="font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="aad-name"
                      className="flex items-center gap-2"
                    >
                      Name
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="aad-name"
                      value={aadhaarData?.name ?? ""}
                      onChange={(e) =>
                        updateAadhaarField("name", e.target.value)
                      }
                      placeholder="Not extracted"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="aad-num"
                      className="flex items-center gap-2"
                    >
                      Aadhaar Number
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="aad-num"
                      value={aadhaarData?.aadhaar_number ?? ""}
                      onChange={(e) =>
                        updateAadhaarField("aadhaar_number", e.target.value)
                      }
                      placeholder="XXXX XXXX XXXX"
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="aad-dob"
                      className="flex items-center gap-2"
                    >
                      Date of Birth
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="aad-dob"
                      value={aadhaarData?.date_of_birth ?? ""}
                      onChange={(e) =>
                        updateAadhaarField("date_of_birth", e.target.value)
                      }
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="aad-gender"
                      className="flex items-center gap-2"
                    >
                      Gender
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="aad-gender"
                      value={aadhaarData?.gender ?? ""}
                      onChange={(e) =>
                        updateAadhaarField("gender", e.target.value)
                      }
                      placeholder="MALE / FEMALE"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="aad-addr"
                      className="flex items-center gap-2"
                    >
                      Address
                      <Badge variant="outline" className="text-[10px]">
                        AI
                      </Badge>
                    </Label>
                    <Input
                      id="aad-addr"
                      value={aadhaarData?.address ?? ""}
                      onChange={(e) =>
                        updateAadhaarField("address", e.target.value)
                      }
                      placeholder="Full address"
                    />
                  </div>
                </div>
              )}

              <Separator className="my-6" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {director.validated ? (
                    <Badge variant="success">Validated</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/case/${caseId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Upload
        </Button>
        <Button
          onClick={() => router.push(`/case/${caseId}/manual`)}
          disabled={!allValidated}
        >
          Continue to Manual Fields
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
