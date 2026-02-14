import { AppHeader } from "@/components/app-header"
import { Dashboard } from "@/components/dashboard"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Dashboard />
      </main>
    </div>
  )
}
