"use client"

import { disableDemoMode, advanceDemoScenario, reverseDemoScenario } from "@/app/actions/demo"
import { EyeOff, ChevronLeft, ChevronRight } from "lucide-react"
import type { DemoScenario } from "@/lib/demo-mode"

const SCENARIO_LABELS: Record<DemoScenario, string> = {
  blank: "Blank",
  "space-ready": "Space Configured",
  "study-in-progress": "Study Running",
  "study-complete": "Study Complete",
  "model-created": "Model Created",
}

const NEXT_LABELS: Partial<Record<DemoScenario, string>> = {
  blank: "Space Configured",
  "space-ready": "Study Running",
  "study-in-progress": "Study Complete",
  "study-complete": "Model Created",
}

const PREV_LABELS: Partial<Record<DemoScenario, string>> = {
  "space-ready": "Blank",
  "study-in-progress": "Space Configured",
  "study-complete": "Study Running",
  "model-created": "Study Complete",
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
      <div className="flex items-center gap-2">
        {PREV_LABELS[scenario] && (
          <form action={reverseDemoScenario.bind(null, scenario)}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs px-3 py-1 rounded border border-yellow-500/60 hover:border-yellow-400 hover:text-yellow-200 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors whitespace-nowrap font-medium"
            >
              <ChevronLeft className="h-3 w-3" />
              {PREV_LABELS[scenario]}
            </button>
          </form>
        )}
        {NEXT_LABELS[scenario] && (
          <form action={advanceDemoScenario.bind(null, scenario)}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs px-3 py-1 rounded border border-yellow-500/60 hover:border-yellow-400 hover:text-yellow-200 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors whitespace-nowrap font-medium"
            >
              {NEXT_LABELS[scenario]}
              <ChevronRight className="h-3 w-3" />
            </button>
          </form>
        )}
        <form action={disableDemoMode}>
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded border border-yellow-500/40 hover:border-yellow-500/80 hover:text-yellow-300 transition-colors whitespace-nowrap"
          >
            Exit demo
          </button>
        </form>
      </div>
    </div>
  )
}
