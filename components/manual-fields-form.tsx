"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import type { Case, DirectorInfo, CompanyInfo, ProfessionalInfo } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ManualFieldsFormProps {
  caseId: string
}

export function ManualFieldsForm({ caseId }: ManualFieldsFormProps) {
  const { data: caseData, mutate } = useSWR<Case>(
    `/api/cases/${caseId}`,
    fetcher
  )
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [directors, setDirectors] = useState<[Partial<DirectorInfo>, Partial<DirectorInfo>] | null>(null)
  const [company, setCompany] = useState<Partial<CompanyInfo> | null>(null)
  const [professional, setProfessional] = useState<Partial<ProfessionalInfo> | null>(null)

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Initialize local state from case data
  const d = directors ?? [
    { ...caseData.directors[0] },
    { ...caseData.directors[1] },
  ]
  const c = company ?? { ...caseData.companyInfo }
  const p = professional ?? { ...caseData.professionalInfo }

  function updateDirector(
    idx: number,
    field: keyof DirectorInfo,
    value: string
  ) {
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
    setSaving(true)
    try {
      const updatedDirectors = caseData!.directors.map((dir, idx) => ({
        ...dir,
        ...(d[idx] ?? {}),
      }))

      await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directors: updatedDirectors,
          companyInfo: { ...caseData!.companyInfo, ...c },
          professionalInfo: { ...caseData!.professionalInfo, ...p },
        }),
      })
      await mutate()
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
    {
      key: "placeOfBirth",
      label: "Place of Birth",
      placeholder: "e.g., Chennai",
    },
    {
      key: "nationality",
      label: "Nationality",
      placeholder: "Indian",
    },
    {
      key: "residentOfIndia",
      label: "Resident of India",
      placeholder: "Yes / No",
    },
    {
      key: "occupation",
      label: "Occupation",
      placeholder: "e.g., Business",
    },
    {
      key: "education",
      label: "Educational Qualification",
      placeholder: "e.g., B.Com",
    },
    {
      key: "sharesSubscribed",
      label: "No. of Shares Subscribed",
      placeholder: "e.g., 5000",
    },
    {
      key: "durationAtAddress",
      label: "Duration of Stay at Address",
      placeholder: "e.g., 5 years",
    },
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
    {
      key: "dinNumber",
      label: "DIN Number",
      placeholder: "e.g., 12345678",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
            <h1 className="text-xl font-semibold text-foreground">
              Manual Fields
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {caseData.name} - Fill remaining details
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="outline">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Progress
        </Button>
      </div>

      {/* Director Details - Side by Side */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Director Details</CardTitle>
          <CardDescription>
            Fill in details for both directors that cannot be extracted by AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-2">
            {[0, 1].map((dirIdx) => (
              <div key={dirIdx} className="flex flex-col gap-4">
                <h3 className="font-medium text-foreground text-sm">
                  Director {dirIdx + 1}
                  {caseData.directors[dirIdx].panData?.name && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({caseData.directors[dirIdx].panData!.name})
                    </span>
                  )}
                </h3>
                {directorFields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <Label
                      htmlFor={`dir-${dirIdx}-${field.key}`}
                      className="text-xs"
                    >
                      {field.label}
                    </Label>
                    <Input
                      id={`dir-${dirIdx}-${field.key}`}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      value={
                        (d[dirIdx]?.[field.key] as string) ?? ""
                      }
                      onChange={(e) =>
                        updateDirector(dirIdx, field.key, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Information</CardTitle>
          <CardDescription>
            Registered office and share capital details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="office-email" className="text-xs">
                Office Email ID
              </Label>
              <Input
                id="office-email"
                type="email"
                placeholder="office@company.com"
                value={c.officeEmail ?? ""}
                onChange={(e) => updateCompany("officeEmail", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="office-mobile" className="text-xs">
                Office Mobile No.
              </Label>
              <Input
                id="office-mobile"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={c.officeMobile ?? ""}
                onChange={(e) => updateCompany("officeMobile", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="latitude" className="text-xs">
                Latitude
              </Label>
              <Input
                id="latitude"
                placeholder="e.g., 13.0827"
                value={c.latitude ?? ""}
                onChange={(e) => updateCompany("latitude", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="longitude" className="text-xs">
                Longitude
              </Label>
              <Input
                id="longitude"
                placeholder="e.g., 80.2707"
                value={c.longitude ?? ""}
                onChange={(e) => updateCompany("longitude", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-capital" className="text-xs">
                Total Authorized Share Capital
              </Label>
              <Input
                id="auth-capital"
                placeholder="e.g., 10,00,000"
                value={c.authorizedShareCapital ?? ""}
                onChange={(e) =>
                  updateCompany("authorizedShareCapital", e.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paid-capital" className="text-xs">
                Total Paid-up Share Capital
              </Label>
              <Input
                id="paid-capital"
                placeholder="e.g., 1,00,000"
                value={c.paidUpShareCapital ?? ""}
                onChange={(e) =>
                  updateCompany("paidUpShareCapital", e.target.value)
                }
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="objectives" className="text-xs">
                Objectives of the Company
              </Label>
              <Textarea
                id="objectives"
                rows={3}
                value={c.objectives ?? ""}
                onChange={(e) => updateCompany("objectives", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="other-objectives" className="text-xs">
                Other Objectives
              </Label>
              <Textarea
                id="other-objectives"
                rows={2}
                placeholder="Additional objectives (optional)"
                value={c.otherObjectives ?? ""}
                onChange={(e) =>
                  updateCompany("otherObjectives", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Information</CardTitle>
          <CardDescription>
            Details of the CA/CS/Advocate filing the incorporation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prof-name" className="text-xs">
                Name of CA/CS/Advocate
              </Label>
              <Input
                id="prof-name"
                placeholder="Full name"
                value={p.name ?? ""}
                onChange={(e) => updateProfessional("name", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prof-membership" className="text-xs">
                Membership No.
              </Label>
              <Input
                id="prof-membership"
                placeholder="e.g., 123456"
                value={p.membershipNo ?? ""}
                onChange={(e) =>
                  updateProfessional("membershipNo", e.target.value)
                }
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="prof-address" className="text-xs">
                Professional Address
              </Label>
              <Textarea
                id="prof-address"
                rows={2}
                placeholder="Full address"
                value={p.address ?? ""}
                onChange={(e) => updateProfessional("address", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/case/${caseId}/review`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Review
        </Button>
        <Button
          onClick={async () => {
            await handleSave()
            router.push(`/case/${caseId}/export`)
          }}
        >
          Continue to Export
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
