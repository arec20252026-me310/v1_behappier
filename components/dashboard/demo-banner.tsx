"use client"

import { disableDemoMode, advanceDemoScenario, reverseDemoScenario, setDemoSpaceId } from "@/app/actions/demo"
import { EyeOff, ChevronLeft, ChevronRight, Building2 } from "lucide-react"
import type { DemoScenario } from "@/lib/demo-mode"
import { SPACE_ID, LGQ_SPACE_ID } from "@/lib/demo-seeds"

const DEMO_SPACES = [
  { id: SPACE_ID,     name: "Peterson Loft" },
  { id: LGQ_SPACE_ID, name: "Looking Glass HQ" },
]

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
  demoSpaceId: string
}

export function DemoBanner({ scenario, demoSpaceId }: DemoBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 shrink-0" />
        <span className="font-medium">Demo mode active</span>
        <span className="text-yellow-400/60 hidden sm:inline">— {SCENARIO_LABELS[scenario]} scenario</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Space switcher */}
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-yellow-400/60" />
          {DEMO_SPACES.map(s => (
            <form key={s.id} action={setDemoSpaceId.bind(null, s.id)}>
              <button
                type="submit"
                className={`text-xs px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
                  demoSpaceId === s.id
                    ? "border-yellow-400 bg-yellow-500/20 text-yellow-200 font-medium"
                    : "border-yellow-500/40 hover:border-yellow-500/80 hover:text-yellow-300"
                }`}
              >
                {s.name}
              </button>
            </form>
          ))}
        </div>
        <div className="w-px h-4 bg-yellow-500/30" />
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
    </div>
  )
}
