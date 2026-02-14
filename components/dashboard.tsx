"use client"

import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Building2,
  Calendar,
  ChevronRight,
  Users,
  FileSearch,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { NewCaseDialog } from "@/components/new-case-dialog"
import type { Case } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Dashboard() {
  const { data: cases, mutate, isLoading } = useSWR<Case[]>("/api/cases", fetcher)
  const router = useRouter()

  const stats = {
    total: cases?.length ?? 0,
    draft: cases?.filter((c) => c.status === "draft").length ?? 0,
    reviewing: cases?.filter((c) => c.status === "reviewing").length ?? 0,
    complete: cases?.filter((c) => c.status === "complete").length ?? 0,
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Company Formation Cases
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage incorporation cases and document workflows
          </p>
        </div>
        <NewCaseDialog onCaseCreated={() => mutate()} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Cases", value: stats.total, icon: Building2 },
          { label: "Drafts", value: stats.draft, icon: FileSearch },
          { label: "In Review", value: stats.reviewing, icon: Users },
          { label: "Complete", value: stats.complete, icon: Calendar },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cases Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : cases && cases.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Case Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Directors
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cases.map((caseItem) => (
                  <tr
                    key={caseItem.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => router.push(`/case/${caseItem.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/case/${caseItem.id}`)
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                          <Building2 className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <span className="font-medium text-foreground">
                          {caseItem.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(caseItem.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={caseItem.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      2 Directors
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-medium text-foreground">
              No cases yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first incorporation case to get started.
            </p>
            <div className="mt-6">
              <NewCaseDialog onCaseCreated={() => mutate()} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
