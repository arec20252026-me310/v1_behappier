"use client"

import { disableDemoMode } from "@/app/actions/demo"
import { EyeOff } from "lucide-react"
import type { DemoScenario } from "@/lib/demo-mode"

const SCENARIO_LABELS: Record<DemoScenario, string> = {
  blank: "Blank",
  "space-ready": "Space Configured",
  "study-in-progress": "Study Running",
  "study-complete": "Study Complete",
}

interface DemoBannerProps {
  scenario: DemoScenario
}

export function DemoBanner({ scenario }: DemoBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 shrink-0" />
        <span className="font-medium">Demo mode active</span>
        <span className="text-yellow-400/60 hidden sm:inline">— {SCENARIO_LABELS[scenario]} scenario</span>
      </div>
      <form action={disableDemoMode}>
        <button
          type="submit"
          className="text-xs px-3 py-1 rounded border border-yellow-500/40 hover:border-yellow-500/80 hover:text-yellow-300 transition-colors whitespace-nowrap"
        >
          Exit demo mode
        </button>
      </form>
    </div>
  )
}
