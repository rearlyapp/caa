import { AppHeader } from "@/components/app-header"
import { ReviewTool } from "@/components/review-tool"

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ReviewTool caseId={id} />
      </main>
    </div>
  )
}
