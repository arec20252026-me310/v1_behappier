"use client"

import { useRef, useState, useEffect } from "react"
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const SERIES_COLORS = [
  "oklch(0.7 0.15 200)",
  "oklch(0.65 0.18 160)",
  "oklch(0.75 0.15 80)",
  "oklch(0.65 0.2 30)",
  "oklch(0.6 0.18 280)",
]

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.17 0.01 260)",
  border: "1px solid oklch(0.28 0.01 260)",
  borderRadius: "0.5rem",
  color: "oklch(0.95 0 0)",
  fontSize: 11,
}

export interface ChartSeries {
  title: string
  labels: string[]
  values: (number | null)[]
  lower?: (number | null)[]
  upper?: (number | null)[]
}

interface TimeSeriesChartProps {
  series: ChartSeries[]
  height?: number
}

function formatLabel(label: string): string {
  if (label.includes("T") && label.length > 15) {
    const d = new Date(label)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    }
  }
  return label
}

function mergeSeriesData(series: ChartSeries[]): Record<string, unknown>[] {
  if (!series.length) return []
  const base = series.reduce((a, b) => (b.labels.length > a.labels.length ? b : a))
  return base.labels.map((label, i) => {
    const point: Record<string, unknown> = { name: formatLabel(label), _raw: label }
    series.forEach(s => {
      point[s.title] = s.values[i] ?? null
      if (s.lower && s.upper) {
        const lo = s.lower[i] ?? null
        const hi = s.upper[i] ?? null
        point[`${s.title}_ci_base`] = lo
        point[`${s.title}_ci_band`] = lo !== null && hi !== null ? Math.max(0, hi - lo) : null
      }
    })
    return point
  })
}

function formatDuration(ms: number): string {
  const s = ms / 1000
  if (s < 90) return `${Math.round(s)}s`
  const m = s / 60
  if (m < 90) return `${Math.round(m)} min`
  const h = m / 60
  if (h < 36) return `${Math.round(h)} hr`
  const d = h / 24
  return `${Math.round(d)} day${Math.round(d) !== 1 ? "s" : ""}`
}

function parseTimestamp(raw: string): number | null {
  if (!raw) return null
  // Standard ISO or browser-parseable string (e.g. "2026-05-05T19:55:59.313+00:00")
  let ms = new Date(raw).getTime()
  if (!isNaN(ms)) return ms
  // Space-separated datetime "2024-01-15 10:30:00"
  ms = new Date(raw.replace(" ", "T")).getTime()
  if (!isNaN(ms)) return ms
  // Time-only "HH:MM:SS" or "H:MM:SS" — convert to ms from midnight
  const hms = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (hms) return (Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])) * 1000
  // Time-only "HH:MM"
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return (Number(hm[1]) * 3600 + Number(hm[2]) * 60) * 1000
  // Unix epoch: seconds (10 digits) or milliseconds (13 digits)
  const n = Number(raw)
  if (!isNaN(n) && n > 0) {
    ms = n > 1e11 ? n : n * 1000
    if (!isNaN(new Date(ms).getTime())) return ms
  }
  return null
}

function viewDuration(allData: Record<string, unknown>[], start: number, end: number): string | null {
  const a = allData[start]?._raw as string | undefined
  const b = allData[end - 1]?._raw as string | undefined
  if (!a || !b || a === b) return null
  const t0 = parseTimestamp(a)
  const t1 = parseTimestamp(b)
  if (t0 === null || t1 === null || t1 <= t0) return null
  return formatDuration(t1 - t0)
}

const MIN_VIEW = 4
// 0.2% zoom per deltaY unit — smooth at typical trackpad pinch speeds
const ZOOM_SENSITIVITY = 0.002

type DragMode = "pan" | "left" | "right"

export function TimeSeriesChart({ series, height = 280 }: TimeSeriesChartProps) {
  const allData = mergeSeriesData(series)
  const total = allData.length

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd, setViewEnd] = useState(total)
  const [dragMode, setDragMode] = useState<DragMode | null>(null)

  const viewRef = useRef({ start: 0, end: total })
  const totalRef = useRef(total)
  useEffect(() => { viewRef.current = { start: viewStart, end: viewEnd } }, [viewStart, viewEnd])
  useEffect(() => {
    totalRef.current = total
    setViewEnd(total)
  }, [total])

  // Pinch-to-zoom on chart area (ctrl+wheel = trackpad pinch)
  const chartRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const { start, end } = viewRef.current
      const len = end - start
      const clamped = Math.max(-80, Math.min(80, e.deltaY))
      // multiply current length by a factor close to 1 — slow and symmetrical
      const multiplier = 1 + clamped * ZOOM_SENSITIVITY
      const newLen = Math.round(Math.min(totalRef.current, Math.max(MIN_VIEW, len * multiplier)))
      const center = (start + end) / 2
      const newStart = Math.max(0, Math.round(center - newLen / 2))
      const newEnd = Math.min(totalRef.current, newStart + newLen)
      setViewStart(newStart)
      setViewEnd(newEnd)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // Scrubber drag (pan / left-resize / right-resize)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    clientX: number
    mode: DragMode
    initStart: number
    initEnd: number
  } | null>(null)

  const startDrag = (e: React.MouseEvent, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      clientX: e.clientX,
      mode,
      initStart: viewRef.current.start,
      initEnd: viewRef.current.end,
    }
    setDragMode(mode)
  }

  // Click on track outside thumb → jump view center to click position, then pan
  const onTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const bar = scrubberRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    const clicked = fraction * totalRef.current
    const len = viewRef.current.end - viewRef.current.start
    const newStart = Math.max(0, Math.min(totalRef.current - len, Math.round(clicked - len / 2)))
    const newEnd = newStart + len
    setViewStart(newStart)
    setViewEnd(newEnd)
    dragRef.current = { clientX: e.clientX, mode: "pan", initStart: newStart, initEnd: newEnd }
    setDragMode("pan")
    e.preventDefault()
  }

  // Global mouse handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !scrubberRef.current) return
      const { clientX, mode, initStart, initEnd } = dragRef.current
      const barWidth = scrubberRef.current.getBoundingClientRect().width
      const delta = Math.round(((e.clientX - clientX) / barWidth) * totalRef.current)
      const len = initEnd - initStart
      if (mode === "pan") {
        const s = Math.max(0, Math.min(totalRef.current - len, initStart + delta))
        setViewStart(s)
        setViewEnd(s + len)
      } else if (mode === "left") {
        const s = Math.max(0, Math.min(initEnd - MIN_VIEW, initStart + delta))
        setViewStart(s)
      } else {
        const end = Math.min(totalRef.current, Math.max(initStart + MIN_VIEW, initEnd + delta))
        setViewEnd(end)
      }
    }
    const onMouseUp = () => {
      if (dragRef.current) { dragRef.current = null; setDragMode(null) }
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  // Keep body cursor consistent while dragging (prevents flicker when mouse moves fast)
  useEffect(() => {
    if (dragMode === "pan") document.body.style.cursor = "grabbing"
    else if (dragMode === "left" || dragMode === "right") document.body.style.cursor = "col-resize"
    else document.body.style.cursor = ""
    return () => { document.body.style.cursor = "" }
  }, [dragMode])

  const toggleSeries = (title: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const resetZoom = () => { setViewStart(0); setViewEnd(total) }

  const isZoomed = viewStart !== 0 || viewEnd !== total
  const windowLen = viewEnd - viewStart
  const visibleData = total > 0 ? allData.slice(viewStart, viewEnd) : allData
  const thumbLeft = total > 0 ? (viewStart / total) * 100 : 0
  const thumbWidth = total > 0 ? (windowLen / total) * 100 : 100

  const thumbBg = dragMode === "pan" ? "oklch(0.60 0.1 200)" : "oklch(0.46 0.08 200)"
  const handleBg = dragMode === "left" || dragMode === "right"
    ? "oklch(0.68 0.12 200)"
    : "oklch(0.54 0.10 200)"

  const durationLabel = viewDuration(allData, viewStart, viewEnd) ?? (windowLen > 1 ? `${windowLen} pts` : null)

  const statusLabel =
    dragMode === "pan" ? "Panning…" :
    dragMode === "left" || dragMode === "right" ? "Resizing…" :
    isZoomed ? `${windowLen} of ${total} pts` :
    `${total} pts`

  if (!series.length) return null

  return (
    <div className="space-y-2">
      {/* Series toggle checkboxes */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 px-1">
          {series.map((s, i) => (
            <label key={s.title} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!hidden.has(s.title)}
                onChange={() => toggleSeries(s.title)}
                className="sr-only"
              />
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 border"
                style={{
                  background: hidden.has(s.title) ? "transparent" : SERIES_COLORS[i % SERIES_COLORS.length],
                  borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
                }}
              />
              <span className="text-xs" style={{ color: hidden.has(s.title) ? "oklch(0.5 0 0)" : "oklch(0.75 0 0)" }}>
                {s.title}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Chart — pinch-to-zoom only */}
      <div ref={chartRef} style={{ height, userSelect: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" vertical={false} />
            <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="oklch(0.65 0 0)" fontSize={10} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "oklch(0.65 0 0)" }}
              formatter={(value: unknown, name: string) => {
                if (typeof name === "string" && (name.endsWith("_ci_base") || name.endsWith("_ci_band"))) return null
                return [typeof value === "number" ? value.toFixed(3) : value, name]
              }}
            />
            {series.map((s, i) => {
              const color = SERIES_COLORS[i % SERIES_COLORS.length]
              const isHidden = hidden.has(s.title)
              return [
                s.lower && s.upper ? (
                  <Area key={`${s.title}_ci_base`} type="monotone" dataKey={`${s.title}_ci_base`}
                    stackId={`ci_${s.title}`} stroke="none" fill="transparent" legendType="none"
                    connectNulls hide={isHidden} />
                ) : null,
                s.lower && s.upper ? (
                  <Area key={`${s.title}_ci_band`} type="monotone" dataKey={`${s.title}_ci_band`}
                    stackId={`ci_${s.title}`} stroke="none" fill={color} fillOpacity={0.15}
                    legendType="none" connectNulls hide={isHidden} />
                ) : null,
                <Line key={s.title} type="monotone" dataKey={s.title}
                  stroke={color} strokeWidth={2} dot={false} connectNulls hide={isHidden} />,
              ]
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scrubber */}
      {total > 0 && (
        <div className="px-1 space-y-1">
          {/*
            Outer wrapper = scrubberRef (used for width calculations).
            Height 20px gives circles (14px) room to protrude above/below the 10px track.
            overflow: visible so circles aren't clipped.
          */}
          <div
            ref={scrubberRef}
            className="relative w-full"
            style={{ height: 20, cursor: "default" }}
            onMouseDown={onTrackMouseDown}
          >
            {/* Visual track bar — centered vertically, clips thumb fill to pill shape */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: 12,
                transform: "translateY(-50%)",
                borderRadius: "9999px",
                background: "oklch(0.22 0.01 260)",
                overflow: "hidden",
              }}
            >
              {/* Thumb fill — pan zone */}
              <div
                style={{
                  position: "absolute",
                  left: `${thumbLeft}%`,
                  width: `${thumbWidth}%`,
                  top: 0,
                  height: "100%",
                  background: thumbBg,
                  cursor: dragMode === "pan" ? "grabbing" : "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                onMouseDown={e => { e.stopPropagation(); startDrag(e, "pan") }}
              >
                {/* Duration label centered on pill */}
                {durationLabel && (
                  <span
                    style={{
                      fontSize: 9,
                      lineHeight: 1,
                      color: "oklch(0.92 0 0)",
                      pointerEvents: "none",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {durationLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Left circle handle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${thumbLeft}%`,
                transform: "translate(-50%, -50%)",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: handleBg,
                border: "1.5px solid oklch(0.72 0.13 200)",
                cursor: "col-resize",
                zIndex: 2,
                boxSizing: "border-box",
              }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e, "left") }}
            />

            {/* Right circle handle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${thumbLeft + thumbWidth}%`,
                transform: "translate(-50%, -50%)",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: handleBg,
                border: "1.5px solid oklch(0.72 0.13 200)",
                cursor: "col-resize",
                zIndex: 2,
                boxSizing: "border-box",
              }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e, "right") }}
            />
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "oklch(0.45 0 0)" }}>
              {statusLabel}
            </span>
            {isZoomed && (
              <button
                onClick={resetZoom}
                className="text-xs px-2 py-0.5 rounded border transition-colors"
                style={{ borderColor: "oklch(0.35 0.01 260)", color: "oklch(0.55 0 0)" }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "oklch(0.85 0 0)"
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.55 0.01 260)"
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "oklch(0.55 0 0)"
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.35 0.01 260)"
                }}
              >
                Reset zoom
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
