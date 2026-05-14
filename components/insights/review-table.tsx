"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { SnapshotCell } from "./snapshot-cell"
import type { DetectionRow } from "./insights-list"

function snapshotUrl(imageId: string): string {
  const path = `snapshots/camera_loft_camera_fluent/${imageId}.jpg`
  return `/api/snapshot?path=${encodeURIComponent(path)}`
}

interface ReviewTableProps {
  columns: string[]
  rows: string[][]
  detections: DetectionRow[]
  title?: string
}

export function ReviewTable({ columns, rows, detections, title }: ReviewTableProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const close = useCallback(() => setOpenIdx(null), [])
  const prev = useCallback(() => setOpenIdx(i => (i !== null && i > 0 ? i - 1 : i)), [])
  const next = useCallback(() => setOpenIdx(i => (i !== null && i < rows.length - 1 ? i + 1 : i)), [rows.length])

  useEffect(() => {
    if (openIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openIdx, prev, next, close])

  const currentDetection = openIdx !== null ? detections[openIdx] : null
  const currentRow = openIdx !== null ? rows[openIdx] : null
  const canPrev = openIdx !== null && openIdx > 0
  const canNext = openIdx !== null && openIdx < rows.length - 1

  return (
    <>
      <div className="space-y-1.5">
        {title && <p className="text-xs text-muted-foreground">{title}</p>}
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap w-14">
                  Snapshot
                </th>
                {columns.map((col, ci) => (
                  <th key={ci} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-2 py-1">
                    <SnapshotCell
                      imageId={detections[ri]?.image_id}
                      onExpand={() => setOpenIdx(ri)}
                    />
                  </td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 text-foreground/80">
                      {cell ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={close}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
            onClick={close}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            onClick={e => { e.stopPropagation(); prev() }}
            disabled={!canPrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          {/* Next */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            onClick={e => { e.stopPropagation(); next() }}
            disabled={!canNext}
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {/* Content */}
          <div
            className="flex flex-col gap-3 w-full max-w-2xl max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Counter */}
            <p className="text-center text-xs text-white/50">
              {openIdx + 1} / {rows.length}
            </p>

            {/* Image */}
            {currentDetection && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={snapshotUrl(currentDetection.image_id)}
                alt="Snapshot"
                className="w-full rounded-lg object-contain shadow-2xl"
              />
            )}

            {/* Log entry */}
            <div className="bg-black/60 backdrop-blur rounded-lg p-4 space-y-2.5">
              {currentDetection?.timestamp_pt && (
                <p className="text-xs font-mono text-white/60">{currentDetection.timestamp_pt}</p>
              )}
              {currentRow && columns.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {columns.map((col, ci) => (
                    <div key={ci} className="flex gap-1.5 min-w-0">
                      <span className="text-xs text-white/45 shrink-0">{col}:</span>
                      <span className="text-xs text-white/90 truncate">{currentRow[ci] ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              {currentDetection?.notes && (
                <p className="text-xs text-white/65 leading-relaxed border-t border-white/10 pt-2.5">
                  {currentDetection.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
