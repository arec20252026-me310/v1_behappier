"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { X, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react"
import { SnapshotCell } from "./snapshot-cell"
import type { DetectionRow } from "./insights-list"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"


// Each snapshot produces one row per behavior metric, so rows are not 1:1 with detections.
// Match by the timestamp column value instead of row index.
function buildDetectionByTimestamp(detections: DetectionRow[]): Record<string, DetectionRow> {
  const map: Record<string, DetectionRow> = {}
  for (const d of detections) {
    if (d.timestamp_pt) map[d.timestamp_pt] = d
  }
  return map
}

// Build a URL for the snapshot proxy API. Uses the image_id + cameraId so the
// server-side route can find the file using the service role key (the browser
// anon client has no permission to create signed URLs for private buckets).
function snapshotProxyUrl(imageId: string, cameraId?: string | null): string | null {
  if (!imageId) return null
  if (cameraId) {
    const path = `snapshots/${cameraId}/${imageId}.jpg`
    return `/api/snapshot?path=${encodeURIComponent(path)}`
  }
  return `/api/snapshot?image_id=${encodeURIComponent(imageId)}`
}

interface ReviewTableProps {
  columns: string[]
  rows: string[][]
  detections: DetectionRow[]
  title?: string
  cameraId?: string | null
}

type Verdict = "correct" | "incorrect"
// evaluations[detectionId][behaviorName] = verdict
type Evaluations = Record<string, Record<string, Verdict>>

const PAGE_SIZE = 30

export function ReviewTable({ columns, rows, detections, title, cameraId }: ReviewTableProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluations>({})
  const [page, setPage] = useState(0)
  const supabase = useRef(createClient()).current

  // Reset to first page if the row set changes (e.g. study switched)
  useEffect(() => { setPage(0) }, [rows.length])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageStart = page * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, rows.length)
  const pageRows = rows.slice(pageStart, pageEnd)

  // Load persisted evaluations from Supabase on mount
  useEffect(() => {
    const ids = detections.map(d => d.id).filter(Boolean)
    if (ids.length === 0) return
    supabase
      .from("behavior_evaluations")
      .select("detection_id, behavior_name, verdict")
      .in("detection_id", ids)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const loaded: Evaluations = {}
        for (const row of data) {
          if (!loaded[row.detection_id]) loaded[row.detection_id] = {}
          loaded[row.detection_id][row.behavior_name] = row.verdict as Verdict
        }
        setEvaluations(loaded)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Column index helpers
  const tsColIdx = useMemo(() => columns.findIndex(c => /^timestamp/i.test(c)), [columns])
  const behaviorColIdx = useMemo(() => columns.findIndex(c => /^behavior/i.test(c)), [columns])

  // Timestamp → detection lookup
  const detectionByTimestamp = useMemo(() => buildDetectionByTimestamp(detections), [detections])
  const getRowDetection = useCallback((rowIdx: number): DetectionRow | null => {
    const row = rows[rowIdx]
    if (!row) return null
    if (tsColIdx >= 0 && row[tsColIdx]) {
      return detectionByTimestamp[row[tsColIdx]] ?? detections[rowIdx] ?? null
    }
    return detections[rowIdx] ?? null
  }, [rows, tsColIdx, detectionByTimestamp, detections])


  // Unique snapshot count (detections represented in the table)
  const uniqueDetectionCount = useMemo(() => {
    const seen = new Set<string>()
    for (const row of rows) {
      const ts = tsColIdx >= 0 ? row[tsColIdx] : null
      if (ts) seen.add(ts)
    }
    return seen.size || rows.length
  }, [rows, tsColIdx])

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

  const setVerdict = useCallback((detId: string, behaviorName: string, verdict: Verdict) => {
    let isToggleOff = false
    setEvaluations(prev => {
      const detEvals = prev[detId] ?? {}
      if (detEvals[behaviorName] === verdict) {
        isToggleOff = true
        const updated = { ...detEvals }
        delete updated[behaviorName]
        return { ...prev, [detId]: updated }
      }
      return { ...prev, [detId]: { ...detEvals, [behaviorName]: verdict } }
    })

    // Persist to Supabase
    if (isToggleOff) {
      supabase.from("behavior_evaluations")
        .delete()
        .eq("detection_id", detId)
        .eq("behavior_name", behaviorName)
        .then()
    } else {
      const studyId = detections.find(d => d.id === detId)?.study_id ?? null
      supabase.from("behavior_evaluations")
        .upsert(
          { detection_id: detId, behavior_name: behaviorName, verdict, study_id: studyId, updated_at: new Date().toISOString() },
          { onConflict: "detection_id,behavior_name" }
        )
        .then()
    }

    // Always advance to the next row (each row = one behavior)
    if (!isToggleOff) {
      setOpenIdx(i => (i !== null && i < rows.length - 1 ? i + 1 : null))
    }
  }, [rows.length, detections, supabase])

  // Accuracy per behavior across all evaluated detections
  const accuracySummary = useMemo(() => {
    const counts: Record<string, { correct: number; total: number }> = {}
    for (const behaviorVerdicts of Object.values(evaluations)) {
      for (const [behaviorName, verdict] of Object.entries(behaviorVerdicts)) {
        if (!counts[behaviorName]) counts[behaviorName] = { correct: 0, total: 0 }
        counts[behaviorName].total++
        if (verdict === "correct") counts[behaviorName].correct++
      }
    }
    return Object.entries(counts).map(([metric, { correct, total }]) => ({ metric, correct, total }))
  }, [evaluations])

  // All rows evaluated = one verdict per row
  const evaluatedRowCount = useMemo(() => {
    let count = 0
    for (let ri = 0; ri < rows.length; ri++) {
      const det = getRowDetection(ri)
      const behaviorName = behaviorColIdx >= 0 ? rows[ri][behaviorColIdx] : null
      if (det && behaviorName && evaluations[det.id]?.[behaviorName]) count++
    }
    return count
  }, [evaluations, rows, getRowDetection, behaviorColIdx])

  const allEvaluated = evaluatedRowCount === rows.length && rows.length > 0

  const currentDetection = openIdx !== null ? getRowDetection(openIdx) : null
  const currentRow = openIdx !== null ? rows[openIdx] : null
  const currentBehaviorName = currentRow && behaviorColIdx >= 0 ? currentRow[behaviorColIdx] : null
  const currentVerdict = currentDetection && currentBehaviorName
    ? evaluations[currentDetection.id]?.[currentBehaviorName] ?? null
    : null
  const canPrev = openIdx !== null && openIdx > 0
  const canNext = openIdx !== null && openIdx < rows.length - 1

  return (
    <>
      <div className="space-y-3">
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
              {pageRows.map((row, pageRi) => {
                const ri = pageStart + pageRi
                const det = getRowDetection(ri)
                const behaviorName = behaviorColIdx >= 0 ? row[behaviorColIdx] : null
                const verdict = det && behaviorName ? evaluations[det.id]?.[behaviorName] : undefined
                return (
                  <tr
                    key={ri}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/20",
                      verdict === "correct" && "bg-green-500/5",
                      verdict === "incorrect" && "bg-red-500/5",
                    )}
                  >
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        {verdict && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            verdict === "correct" ? "bg-green-500" : "bg-red-500"
                          )} />
                        )}
                        <SnapshotCell
                          signedUrl={det ? snapshotProxyUrl(det.image_id, cameraId) : null}
                          onExpand={() => setOpenIdx(ri)}
                        />
                      </div>
                    </td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1.5 text-foreground/80">
                        {cell ?? "—"}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <p className="text-muted-foreground">
              Showing {pageStart + 1}–{pageEnd} of {rows.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-2 py-1 rounded border border-border hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                « First
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 rounded border border-border hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Prev
              </button>
              <span className="px-2 text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded border border-border hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next ›
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded border border-border hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Last »
              </button>
            </div>
          </div>
        )}

        {/* Accuracy summary — shown as soon as any behavior is evaluated */}
        {accuracySummary.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metric Accuracy — {evaluatedRowCount} of {rows.length} rows evaluated{allEvaluated ? " ✓" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {accuracySummary.map(({ metric, correct, total }) => {
                const pct = Math.round((correct / total) * 100)
                return (
                  <div key={metric} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 min-w-[140px]">
                    <div>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">{metric}</p>
                      <p className={cn(
                        "text-xl font-semibold",
                        pct >= 80 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {pct}%
                      </p>
                      <p className="text-xs text-muted-foreground">{correct}/{total} correct</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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

            {/* Image — uses the same signed URL we already generated for the
                thumbnail, so no extra request when the lightbox opens. */}
            {currentDetection && snapshotProxyUrl(currentDetection.image_id, cameraId) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={snapshotProxyUrl(currentDetection.image_id, cameraId)!}
                alt="Snapshot"
                className="w-full rounded-lg object-contain shadow-2xl"
              />
            )}

            {/* Single behavior evaluation — matches the row that was clicked */}
            {currentDetection && currentBehaviorName && (
              <div className="flex items-center justify-between gap-3 bg-black/60 backdrop-blur rounded-lg px-4 py-3">
                <span className="text-sm text-white/80">{currentBehaviorName}</span>
                <div className="flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setVerdict(currentDetection.id, currentBehaviorName, "correct") }}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      currentVerdict === "correct"
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-white/70 hover:bg-green-500/40 hover:text-white"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Correct
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setVerdict(currentDetection.id, currentBehaviorName, "incorrect") }}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      currentVerdict === "incorrect"
                        ? "bg-red-500 text-white"
                        : "bg-white/10 text-white/70 hover:bg-red-500/40 hover:text-white"
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Incorrect
                  </button>
                </div>
              </div>
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
