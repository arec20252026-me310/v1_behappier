"use client"

import { disableReviewMode } from "@/app/actions/review"
import { Microscope } from "lucide-react"

export function ReviewBanner() {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-blue-400 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <Microscope className="h-4 w-4 shrink-0" />
        <span className="font-medium">Review mode active</span>
        <span className="text-blue-400/60 hidden sm:inline">— snapshots saved alongside detections · visible in Insights tab</span>
      </div>
      <form action={disableReviewMode}>
        <button
          type="submit"
          className="text-xs px-3 py-1 rounded border border-blue-500/40 hover:border-blue-500/80 hover:text-blue-300 transition-colors whitespace-nowrap"
        >
          Exit review mode
        </button>
      </form>
    </div>
  )
}
