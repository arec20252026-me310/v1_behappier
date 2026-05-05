"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const SERIES_COLORS = [
  "oklch(0.7 0.15 200)",   // chart-1 teal
  "oklch(0.65 0.18 160)",  // chart-2 green
  "oklch(0.75 0.15 80)",   // chart-3 yellow
  "oklch(0.65 0.2 30)",    // chart-4 orange
  "oklch(0.6 0.18 280)",   // chart-5 purple
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
    const point: Record<string, unknown> = { name: formatLabel(label) }
    series.forEach(s => {
      point[s.title] = s.values[i] ?? null
    })
    return point
  })
}

const MIN_VIEW = 4
// Sensitivity: fraction of view length to zoom per 100 deltaY units
const ZOOM_SENSITIVITY = 0.0008

export function TimeSeriesChart({ series, height = 280 }: TimeSeriesChartProps) {
  const allData = mergeSeriesData(series)
  const total = allData.length

  // Series visibility
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  // View window (index-based)
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd, setViewEnd] = useState(total)

  // Keep refs in sync so event handlers never have stale closures
  const viewRef = useRef({ start: 0, end: total })
  const totalRef = useRef(total)
  useEffect(() => {
    viewRef.current = { start: viewStart, end: viewEnd }
  }, [viewStart, viewEnd])
  useEffect(() => {
    totalRef.current = total
    setViewEnd(total)
  }, [total])

  // Drag state
  const dragRef = useRef<{ x: number; start: number; end: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Pinch-to-zoom via ctrl+wheel (two-finger trackpad)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()

      const { start, end } = viewRef.current
      const len = end - start
      // Clamp deltaY so a single fast-swipe can't jump by huge amounts
      const clamped = Math.max(-80, Math.min(80, e.deltaY))
      // Positive deltaY = fingers coming together = zoom out (larger window)
      const factor = 1 + clamped * ZOOM_SENSITIVITY * len
      const newLen = Math.round(Math.min(totalRef.current, Math.max(MIN_VIEW, factor)))
      const center = (start + end) / 2
      const newStart = Math.max(0, Math.round(center - newLen / 2))
      const newEnd = Math.min(totalRef.current, newStart + newLen)

      setViewStart(newStart)
      setViewEnd(newEnd)
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // Click-and-drag pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragRef.current = { x: e.clientX, start: viewRef.current.start, end: viewRef.current.end }
    setIsDragging(true)
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return
      const { x, start, end } = dragRef.current
      const len = end - start
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const indexPerPx = len / containerWidth
      const delta = Math.round((dragRef.current.x - e.clientX) * indexPerPx)
      const newStart = Math.max(0, Math.min(totalRef.current - len, start + delta))
      setViewStart(newStart)
      setViewEnd(newStart + len)
    }

    const onMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null
        setIsDragging(false)
      }
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  const toggleSeries = (title: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const resetZoom = () => {
    setViewStart(0)
    setViewEnd(total)
  }

  const isZoomed = viewStart !== 0 || viewEnd !== total
  const windowLen = viewEnd - viewStart
  const visibleData = total > 0 ? allData.slice(viewStart, viewEnd) : allData

  // Scrubber thumb geometry (percentage of full width)
  const thumbLeft = total > 0 ? (viewStart / total) * 100 : 0
  const thumbWidth = total > 0 ? (windowLen / total) * 100 : 100

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
              <span
                className="text-xs"
                style={{
                  color: hidden.has(s.title) ? "oklch(0.5 0 0)" : "oklch(0.75 0 0)",
                }}
              >
                {s.title}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Chart */}
      <div
        ref={containerRef}
        style={{
          height,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          // Subtle ring while actively dragging so user knows they're in pan mode
          outline: isDragging ? "1px solid oklch(0.45 0.01 260)" : "1px solid transparent",
          borderRadius: "0.375rem",
          transition: "outline-color 0.1s",
        }}
        onMouseDown={onMouseDown}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="oklch(0.65 0 0)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="oklch(0.65 0 0)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "oklch(0.65 0 0)" }}
            />
            {series.map((s, i) => (
              <Line
                key={s.title}
                type="monotone"
                dataKey={s.title}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                hide={hidden.has(s.title)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scrubber bar — always shown when data exists, so panning is always visible */}
      {total > 0 && (
        <div className="px-1 space-y-1">
          <div
            className="relative w-full rounded-full overflow-hidden"
            style={{ height: 6, background: "oklch(0.22 0.01 260)" }}
          >
            <div
              className="absolute h-full rounded-full transition-[left,width] duration-75"
              style={{
                left: `${thumbLeft}%`,
                width: `${thumbWidth}%`,
                background: isDragging ? "oklch(0.6 0.08 200)" : "oklch(0.45 0.05 200)",
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "oklch(0.45 0 0)" }}>
              {isDragging ? "Panning…" : isZoomed ? `${windowLen} of ${total} pts` : `${total} pts`}
            </span>
            {isZoomed && (
              <button
                onClick={resetZoom}
                className="text-xs px-2 py-0.5 rounded border transition-colors"
                style={{
                  borderColor: "oklch(0.35 0.01 260)",
                  color: "oklch(0.55 0 0)",
                }}
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
