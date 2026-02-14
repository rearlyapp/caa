"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, ArrowRight, Loader2, Save, CheckCircle2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { Case, DirectorInfo, CompanyInfo, ProfessionalInfo } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ManualFieldsFormProps {
  caseId: string
}

type StepId = "director1" | "director2" | "company" | "professional"

const STEPS: Array<{ id: StepId; title: string; description: string }> = [
  {
    id: "director1",
    title: "Director 1 Details",
    description: "Complete manual fields for Director 1.",
  },
  {
    id: "director2",
    title: "Director 2 Details",
    description: "Complete manual fields for Director 2.",
  },
  {
    id: "company",
    title: "Company Information",
    description: "Capture office, share capital, and objectives.",
  },
  {
    id: "professional",
    title: "Professional Information",
    description: "Capture filing professional details.",
  },
]

export function ManualFieldsForm({ caseId }: ManualFieldsFormProps) {
  const { data: caseData, mutate } = useSWR<Case>(`/api/cases/${caseId}`, fetcher)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [saveMessage, setSaveMessage] = useState("")

  const [directors, setDirectors] = useState<
    [Partial<DirectorInfo>, Partial<DirectorInfo>] | null
  >(null)
  const [company, setCompany] = useState<Partial<CompanyInfo> | null>(null)
  const [professional, setProfessional] = useState<Partial<ProfessionalInfo> | null>(null)

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const d = directors ?? [{ ...caseData.directors[0] }, { ...caseData.directors[1] }]
  const c = company ?? { ...caseData.companyInfo }
  const p = professional ?? { ...caseData.professionalInfo }

  function updateDirector(idx: number, field: keyof DirectorInfo, value: string) {
    const next = [...d] as [Partial<DirectorInfo>, Partial<DirectorInfo>]
    next[idx] = { ...next[idx], [field]: value }
    setDirectors(next)
  }

  function updateCompany(field: keyof CompanyInfo, value: string) {
    setCompany({ ...c, [field]: value })
  }

  function updateProfessional(field: keyof ProfessionalInfo, value: string) {
    setProfessional({ ...p, [field]: value })
  }

  async function handleSave() {
    if (!caseData) return
    setSaving(true)
    setSaveMessage("")
    try {
      const updatedDirectors = caseData.directors.map((dir, idx) => ({
        ...dir,
        ...(d[idx] ?? {}),
      }))

      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directors: updatedDirectors,
          companyInfo: { ...caseData.companyInfo, ...c },
          professionalInfo: { ...caseData.professionalInfo, ...p },
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to save manual details")
      }
      await mutate()
      setSaveMessage("Saved")
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const directorFields: {
    key: keyof DirectorInfo
    label: string
    placeholder: string
    type?: string
  }[] = [
    { key: "placeOfBirth", label: "Place of Birth", placeholder: "e.g., Chennai" },
    { key: "nationality", label: "Nationality", placeholder: "Indian" },
    { key: "residentOfIndia", label: "Resident of India", placeholder: "Yes / No" },
    { key: "occupation", label: "Occupation", placeholder: "e.g., Business" },
    { key: "education", label: "Educational Qualification", placeholder: "e.g., B.Com" },
    { key: "sharesSubscribed", label: "No. of Shares Subscribed", placeholder: "e.g., 5000" },
    { key: "durationAtAddress", label: "Duration at Address", placeholder: "e.g., 5 years" },
    {
      key: "email",
      label: "Email ID",
      placeholder: "name@example.com",
      type: "email",
    },
    {
      key: "mobile",
      label: "Mobile No.",
      placeholder: "+91 XXXXX XXXXX",
      type: "tel",
    },
    { key: "dinNumber", label: "DIN Number", placeholder: "e.g., 12345678" },
  ]

  const currentStep = STEPS[activeStep]
  const stepProgress = Math.round(((activeStep + 1) / STEPS.length) * 100)

  const isLastStep = activeStep === STEPS.length - 1
  const isFirstStep = activeStep === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/case/${caseId}/review`)}
            aria-label="Back to review"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Manual Fields</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {caseData.name} - Guided form flow
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="outline">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Progress
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              Step {activeStep + 1} of {STEPS.length}
            </span>
            <span className="font-mono text-muted-foreground">{stepProgress}%</span>
          </div>
          <Progress value={stepProgress} />
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step, idx) => (
              <button
                key={step.id}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  idx === activeStep
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setActiveStep(idx)}
                type="button"
              >
                {step.title}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(currentStep.id === "director1" || currentStep.id === "director2") && (
            <div className="space-y-4">
              {(() => {
                const idx = currentStep.id === "director1" ? 0 : 1
                const name = caseData.directors[idx].panData?.name
                return (
                  <>
                    {name && (
                      <p className="text-sm text-muted-foreground">
                        Auto-extracted Name: <span className="font-medium text-foreground">{name}</span>
                      </p>
                    )}
                    {directorFields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={`dir-${idx}-${field.key}`}>{field.label}</Label>
                        <Input
                          id={`dir-${idx}-${field.key}`}
                          type={field.type ?? "text"}
                          placeholder={field.placeholder}
                          value={(d[idx]?.[field.key] as string) ?? ""}
                          onChange={(e) => updateDirector(idx, field.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>
          )}

          {currentStep.id === "company" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Office & Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="office-email">Office Email ID</Label>
                    <Input
                      id="office-email"
                      type="email"
                      placeholder="office@company.com"
                      value={c.officeEmail ?? ""}
                      onChange={(e) => updateCompany("officeEmail", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="office-mobile">Office Mobile No.</Label>
                    <Input
                      id="office-mobile"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={c.officeMobile ?? ""}
                      onChange={(e) => updateCompany("officeMobile", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      placeholder="e.g., 13.0827"
                      value={c.latitude ?? ""}
                      onChange={(e) => updateCompany("latitude", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      placeholder="e.g., 80.2707"
                      value={c.longitude ?? ""}
                      onChange={(e) => updateCompany("longitude", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Share Capital</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-capital">Authorized Share Capital</Label>
                    <Input
                      id="auth-capital"
                      placeholder="e.g., 10,00,000"
                      value={c.authorizedShareCapital ?? ""}
                      onChange={(e) =>
                        updateCompany("authorizedShareCapital", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="paid-capital">Paid-up Share Capital</Label>
                    <Input
                      id="paid-capital"
                      placeholder="e.g., 1,00,000"
                      value={c.paidUpShareCapital ?? ""}
                      onChange={(e) => updateCompany("paidUpShareCapital", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Objectives</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="objectives">Objectives of the Company</Label>
                  <Textarea
                    id="objectives"
                    rows={4}
                    value={c.objectives ?? ""}
                    onChange={(e) => updateCompany("objectives", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="other-objectives">Other Objectives</Label>
                  <Textarea
                    id="other-objectives"
                    rows={3}
                    placeholder="Additional objectives (optional)"
                    value={c.otherObjectives ?? ""}
                    onChange={(e) => updateCompany("otherObjectives", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep.id === "professional" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof-name">Name of CA/CS/Advocate</Label>
                <Input
                  id="prof-name"
                  placeholder="Full name"
                  value={p.name ?? ""}
                  onChange={(e) => updateProfessional("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-membership">Membership No.</Label>
                <Input
                  id="prof-membership"
                  placeholder="e.g., 123456"
                  value={p.membershipNo ?? ""}
                  onChange={(e) => updateProfessional("membershipNo", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-address">Professional Address</Label>
                <Textarea
                  id="prof-address"
                  rows={3}
                  placeholder="Full address"
                  value={p.address ?? ""}
                  onChange={(e) => updateProfessional("address", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (isFirstStep) {
              router.push(`/case/${caseId}/review`)
            } else {
              setActiveStep((prev) => Math.max(0, prev - 1))
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {isFirstStep ? "Back to Review" : "Previous"}
        </Button>
        <Button
          onClick={async () => {
            if (isLastStep) {
              await handleSave()
              router.push(`/case/${caseId}/export`)
            } else {
              setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1))
            }
          }}
          disabled={saving}
        >
          {isLastStep ? "Continue to Export" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
