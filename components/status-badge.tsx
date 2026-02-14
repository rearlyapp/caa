import { Badge } from "@/components/ui/badge"
import type { CaseStatus } from "@/lib/types"

const statusConfig: Record<
  CaseStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  extracting: { label: "Extracting", variant: "warning" },
  reviewing: { label: "Reviewing", variant: "default" },
  complete: { label: "Complete", variant: "success" },
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
