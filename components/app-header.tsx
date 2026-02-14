"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 mr-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            CAA
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            v0.1.0
          </span>
        </div>
      </div>
    </header>
  )
}
