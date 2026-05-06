"use client"

import { disableDemoMode } from "@/app/actions/demo"
import { EyeOff } from "lucide-react"

export function DemoBanner() {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 shrink-0" />
        <span className="font-medium">Demo mode active</span>
        <span className="text-yellow-400/60 hidden sm:inline">— database data is hidden from the UI</span>
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
