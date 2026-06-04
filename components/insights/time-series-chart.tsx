"use client"

import React, { useRef, useState, useEffect } from "react"
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

const SERIES_COLORS = [
  "oklch(0.60 0.17 22)",   // red
  "oklch(0.72 0.16 85)",   // yellow
  "oklch(0.60 0.18 148)",  // green
  "oklch(0.60 0.18 235)",  // blue
  "oklch(0.60 0.17 285)",  // purple (overflow)
]

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: "0.5rem",
  color: "var(--chart-tooltip-text)",
  fontSize: 11,
  padding: "6px 10px",
}

interface TooltipPayloadEntry {
  name: string
  value: unknown
  color?: string
  payload: Record<string, unknown>
}

function ChartTooltip({
  active,
  payload,
  seriesColors,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: unknown
  seriesColors: Record<string, string>
}) {
  if (!active || !payload?.length) return null
  const entries = payload.filter(
    p => !p.name.endsWith("_ci_base") && !p.name.endsWith("_ci_band")
  )
  if (!entries.length) return null
  const readableLabel = entries[0]?.payload?.name as string | undefined
  return (
    <div style={TOOLTIP_STYLE}>
      {readableLabel && (
        <p style={{ color: "oklch(0.65 0 0)", marginBottom: 4, fontSize: 10 }}>{readableLabel}</p>
      )}
      {entries.map(entry => {
        const v = typeof entry.value === "number" ? entry.value : null
        const ciBase = entry.payload[`${entry.name}_ci_base`]
        const ciBand = entry.payload[`${entry.name}_ci_band`]
        let displayValue: string
        if (v !== null && typeof ciBase === "number" && typeof ciBand === "number") {
          const halfGap = ciBand / 2
          displayValue = `${v.toFixed(3)} ± ${halfGap.toFixed(3)}`
        } else {
          displayValue = v !== null ? v.toFixed(3) : String(entry.value ?? "—")
        }
        return (
          <p key={entry.name} style={{ color: seriesColors[entry.name] ?? "oklch(0.95 0 0)", margin: "1px 0" }}>
            <span style={{ color: "oklch(0.65 0 0)" }}>{entry.name}: </span>
            {displayValue}
          </p>
        )
      })}
    </div>
  )
}


interface BiLineLabelProps {
  viewBox?: { x: number; y: number; width: number; height: number }
  value?: string
  angle?: number
  fill?: string
  fontSize?: number
}

function BiLineAxisLabel({ viewBox, value, angle = -90, fill = "currentColor", fontSize = 15 }: BiLineLabelProps) {
  if (!viewBox || !value) return null
  const { x, y, width, height } = viewBox
  const cy = y + height / 2
  const match = value.match(/^(.*?)\s*(\([^)]+\))$/)
  const name = match ? match[1].trim() : value
  const unit = match && name.length > 0 ? match[2] : null
  if (!unit) {
    const cx = x + width / 2
    return (
      <text transform={`translate(${cx},${cy}) rotate(${angle})`} textAnchor="middle" dominantBaseline="middle" fill={fill} fontSize={fontSize}>
        {name}
      </text>
    )
  }
  // Horizontal word-wrapped label.
  // Reserve different tick-label widths: left axis has integer ticks (~10px), right has decimals (~25px).
  const tickAreaW = angle < 0 ? 10 : 25
  const safeW = Math.max(width - tickAreaW, 20)
  const cx = angle < 0
    ? x + safeW / 2               // left axis: outer (left) portion
    : x + tickAreaW + safeW / 2   // right axis: outer (right) portion
  const longestToken = [...name.split(' '), unit].reduce((a, b) => a.length > b.length ? a : b, '')
  const fs = Math.min(fontSize, Math.floor(safeW / (longestToken.length * 0.68)))
  const approxCharW = fs * 0.63
  const maxLineW = safeW - 4
  const nameLines: string[] = []
  let cur = ''
  for (const word of name.split(' ')) {
    const candidate = cur ? `${cur} ${word}` : word
    if (candidate.length * approxCharW <= maxLineW) { cur = candidate }
    else { if (cur) nameLines.push(cur); cur = word }
  }
  if (cur) nameLines.push(cur)
  const lines = [...nameLines, unit]
  const lineH = fs * 1.4
  const startY = cy - (lines.length * lineH) / 2 + lineH / 2
  return (
    <g>
      {lines.map((line, i) => (
        <text key={i} x={cx} y={startY + i * lineH} textAnchor="middle" dominantBaseline="middle" fill={fill} fontSize={fs} fontWeight="bold">{line}</text>
      ))}
    </g>
  )
}

export interface ChartSeries {
  title: string
  labels: string[]
  values: (number | null)[]
  lower?: (number | null)[]
  upper?: (number | null)[]
  unit?: string
}

interface TimeSeriesChartProps {
  series: ChartSeries[]
  height?: number | string
  fillHeight?: boolean
  studyDurationMs?: number
  xAxisLabel?: string
  yAxisLabel?: string
  seriesDescriptions?: Record<string, string>
  isLive?: boolean
  compact?: boolean
  enlarged?: boolean
  dualYAxis?: boolean
}

function lookupDescription(title: string, descriptions: Record<string, string>): string | undefined {
  if (descriptions[title]) return descriptions[title]
  const lower = title.toLowerCase()
  for (const [key, desc] of Object.entries(descriptions)) {
    if (lower.includes(key.toLowerCase())) return desc
  }
  return undefined
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

function msToTimeLabel(ms: number): string {
  if (ms < 86400000) {
    // Relative offset (not a real timestamp) — format as HH:MM:SS
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }
  // Real Unix timestamp — format in Pacific Time to match detection log
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Los_Angeles",
  })
}

function hasCIData(s: ChartSeries): boolean {
  return (
    Array.isArray(s.lower) && s.lower.some(v => v !== null) &&
    Array.isArray(s.upper) && s.upper.some(v => v !== null)
  )
}

function extractTimeFromLabel(raw: string): string {
  // "2026-05-14 15:13:52 PST" → "15:13:52"
  const m = raw.match(/(\d{2}:\d{2}:\d{2})/)
  return m ? m[1] : raw
}

function mergeSeriesData(series: ChartSeries[]): Record<string, unknown>[] {
  if (!series.length) return []

  // Union of all labels across all series, sorted by parsed timestamp
  const labelMs = new Map<string, number>()
  series.forEach(s => {
    s.labels.forEach((label, i) => {
      if (!labelMs.has(label)) {
        const ms = parseTimestamp(label)
        labelMs.set(label, ms ?? i * 1000)
      }
    })
  })

  const allLabels = Array.from(new Set(series.flatMap(s => s.labels)))
  allLabels.sort((a, b) => (labelMs.get(a) ?? 0) - (labelMs.get(b) ?? 0))

  return allLabels.map(label => {
    const ms = labelMs.get(label) ?? 0
    const point: Record<string, unknown> = { name: formatLabel(label), _raw: label, _ms: ms, _timeLabel: extractTimeFromLabel(label) }
    series.forEach(s => {
      const idx = s.labels.indexOf(label)
      const value = idx >= 0 ? (s.values[idx] ?? null) : null
      point[s.title] = value
      if (hasCIData(s)) {
        const lo = idx >= 0 ? (s.lower![idx] ?? null) : null
        const hi = idx >= 0 ? (s.upper![idx] ?? null) : null
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
  let ms = new Date(raw).getTime()
  if (!isNaN(ms)) return ms
  ms = new Date(raw.replace(" ", "T")).getTime()
  if (!isNaN(ms)) return ms
  const hms = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (hms) return (Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])) * 1000
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return (Number(hm[1]) * 3600 + Number(hm[2]) * 60) * 1000
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
  const minutes = Math.max(1, Math.round((t1 - t0) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr`
  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? "s" : ""}`
}

const PRESETS: { label: string; ms: number | null }[] = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 300_000 },
  { label: "10 min", ms: 600_000 },
  { label: "1 day", ms: 86_400_000 },
  { label: "1 week", ms: 604_800_000 },
  { label: "1 month", ms: 2_592_000_000 },
  { label: "All time", ms: null },
]

const MIN_VIEW = 4
const ZOOM_SENSITIVITY = 0.002

type DragMode = "pan" | "left" | "right"

export function TimeSeriesChart({ series, height = 280, fillHeight = false, studyDurationMs, xAxisLabel, yAxisLabel, seriesDescriptions, isLive, compact = false, enlarged = false, dualYAxis = false }: TimeSeriesChartProps) {
  const canDualAxis = series.length === 2
  const leftSeries = canDualAxis
    ? (series.find(s => s.title.toLowerCase().includes("occupancy")) ?? series[0])
    : null
  const rightSeries = canDualAxis
    ? (series.find(s => s !== leftSeries) ?? null)
    : null
  function getSeriesAxisLabel(s: ChartSeries): string {
    if (s.unit && !s.title.includes("(")) return `${s.title} (${s.unit})`
    return s.title
  }
  const leftAxisLabel  = leftSeries  ? getSeriesAxisLabel(leftSeries)  : undefined
  const rightAxisLabel = rightSeries ? getSeriesAxisLabel(rightSeries) : undefined
  const getAxisId = (s: ChartSeries): string | undefined =>
    canDualAxis ? (s === leftSeries ? "left" : "right") : undefined
  const leftAxisColor  = canDualAxis && leftSeries  ? SERIES_COLORS[series.indexOf(leftSeries)  % SERIES_COLORS.length] : "var(--chart-axis)"
  const rightAxisColor = canDualAxis && rightSeries ? SERIES_COLORS[series.indexOf(rightSeries) % SERIES_COLORS.length] : "var(--chart-axis)"

  // Unified font size for both axis labels so they always render at the same size.
  const baseLabelFs = enlarged ? 20 : 18
  const axisLabelFs = (() => {
    if (!canDualAxis) return baseLabelFs
    const cap = (label: string | undefined, axisW: number, tickAreaW: number) => {
      if (!label) return baseLabelFs
      const m = label.match(/^(.*?)\s*(\([^)]+\))$/)
      if (!m) return baseLabelFs
      const tokens = [...m[1].trim().split(' '), m[2]]
      const longest = tokens.reduce((a, b) => a.length > b.length ? a : b, '')
      return Math.min(baseLabelFs, Math.floor(Math.max(axisW - tickAreaW, 20) / (longest.length * 0.68)))
    }
    return Math.min(
      cap(leftAxisLabel,  enlarged ? 153 : 141, 10),  // left: integer ticks
      cap(rightAxisLabel, enlarged ? 207 : 190, 25),  // right: decimal ticks
    )
  })()

  const effectiveYAxisLabel = canDualAxis ? undefined : (yAxisLabel ?? (series.length > 1 ? "Multiple behaviors" : undefined))

  // Per-axis domain and tick config based on series type
  const axisDomain = (s: ChartSeries | null): [number, number | string] =>
    s?.title.toLowerCase().includes("collaboration") ? [0, 1] : [0, 'auto']
  const axisTickFmt = (s: ChartSeries | null) => (v: number) =>
    s?.title.toLowerCase().includes("occupancy") ? String(Math.round(v)) : (Number.isInteger(v) ? String(v) : v.toFixed(2))
  const axisAllowDecimals = (s: ChartSeries | null) =>
    !s?.title.toLowerCase().includes("occupancy")

  const allData = mergeSeriesData(series)
  const total = allData.length

  const [isDark, setIsDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"))
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd, setViewEnd] = useState(total)
  const [dragMode, setDragMode] = useState<DragMode | null>(null)
  const [activePreset, setActivePreset] = useState<string>("All time")
  const [animationActive, setAnimationActive] = useState(true)
  const hasInteracted = useRef(false)

  const disableAnimation = () => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      setAnimationActive(false)
    }
  }

  const viewRef = useRef({ start: 0, end: total })
  const totalRef = useRef(total)
  useEffect(() => { viewRef.current = { start: viewStart, end: viewEnd } }, [viewStart, viewEnd])
  useEffect(() => {
    totalRef.current = total
    setViewEnd(total)
    if (!isLive) {
      setViewStart(0)
      setActivePreset("All time")
    } else if (!hasInteracted.current) {
      setViewStart(0)
    }
  }, [total, isLive])

  // Duration used to filter presets: prefer planned study duration, fall back to actual data span
  const dataDurationMs = total >= 2
    ? Math.abs((allData[total - 1]._ms as number) - (allData[0]._ms as number))
    : 0
  const filterDurationMs = studyDurationMs ?? dataDurationMs
  const visiblePresets = PRESETS.filter(p => p.ms === null || (filterDurationMs > 0 && p.ms <= filterDurationMs))

  // Preset button handler — finds the index corresponding to the last N ms of data
  const applyPreset = (preset: { label: string; ms: number | null }) => {
    setActivePreset(preset.label)
    if (preset.ms === null || total === 0) {
      setViewStart(0)
      setViewEnd(total)
      return
    }
    const lastMs = allData[total - 1]?._ms as number | undefined
    if (lastMs === undefined) return
    const targetMs = lastMs - preset.ms
    let newStart = 0
    for (let i = 0; i < total; i++) {
      if ((allData[i]._ms as number) >= targetMs) {
        newStart = i
        break
      }
    }
    setViewStart(newStart)
    setViewEnd(total)
  }

  // Pinch-to-zoom on chart area
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
      const multiplier = 1 + clamped * ZOOM_SENSITIVITY
      const newLen = Math.round(Math.min(totalRef.current, Math.max(MIN_VIEW, len * multiplier)))
      const center = (start + end) / 2
      const newStart = Math.max(0, Math.round(center - newLen / 2))
      const newEnd = Math.min(totalRef.current, newStart + newLen)
      setViewStart(newStart)
      setViewEnd(newEnd)
      setActivePreset("")
      disableAnimation()
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // Scrubber drag
  const scrubberRef = useRef<HTMLDivElement>(null)

  // Scroll on scrubber → pan (horizontal swipe or vertical scroll, no ctrl needed)
  useEffect(() => {
    const el = scrubberRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { start, end } = viewRef.current
      const len = end - start
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const barWidth = el.getBoundingClientRect().width || 1
      const shift = Math.round((raw / barWidth) * totalRef.current * 4)
      const s = Math.max(0, Math.min(totalRef.current - len, start + shift))
      setViewStart(s)
      setViewEnd(s + len)
      disableAnimation()
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])
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
    if (mode === "left" || mode === "right") setActivePreset("")
    disableAnimation()
  }

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

  const windowLen = viewEnd - viewStart
  const visibleData = total > 0 ? allData.slice(viewStart, viewEnd) : allData
  const thumbLeft = total > 0 ? (viewStart / total) * 100 : 0
  const thumbWidth = total > 0 ? (windowLen / total) * 100 : 100

  const seriesColors: Record<string, string> = Object.fromEntries(
    series.map((s, i) => [s.title, SERIES_COLORS[i % SERIES_COLORS.length]])
  )

  const msToLabel = React.useMemo(() => {
    const m = new Map<number, string>()
    allData.forEach(d => m.set(d._ms as number, d._timeLabel as string))
    return m
  }, [allData])
  const xTickFormatter = React.useCallback((ms: number) => msToLabel.get(ms) ?? msToTimeLabel(ms), [msToLabel])

  const thumbBg = dragMode === "pan" ? "oklch(0.60 0.13 22)" : "oklch(0.46 0.12 22)"
  const handleBg = dragMode === "left" || dragMode === "right"
    ? "oklch(0.68 0.14 22)"
    : "oklch(0.54 0.13 22)"

  const durationLabel = activePreset
    ? activePreset
    : (viewDuration(allData, viewStart, viewEnd) ?? (windowLen > 1 ? `${windowLen} pts` : null))

  const statusLabel =
    dragMode === "pan" ? "Panning…" :
    dragMode === "left" || dragMode === "right" ? "Resizing…" :
    `${windowLen} of ${total} pts`

  if (!series.length) return null

  return (
    <div className={fillHeight ? "flex-1 min-h-0 flex flex-col gap-2" : "space-y-2"}>
      {/* Series toggle checkboxes */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 px-1">
          {series.map((s, i) => {
            const desc = seriesDescriptions ? lookupDescription(s.title, seriesDescriptions) : undefined
            return (
              <div key={s.title} className="flex items-center gap-1">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
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
                  <span className={cn(enlarged ? "text-sm" : "text-sm", hidden.has(s.title) ? "text-muted-foreground/60" : "text-foreground")}>
                    {s.title}
                  </span>
                </label>
                {desc && (
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground" style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
                        <Info style={{ width: 11, height: 11 }} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">{desc}</TooltipContent>
                  </UITooltip>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Preset duration buttons */}
      {!compact && total > 0 && (
        <div className="flex items-center gap-1 px-1">
          {visiblePresets.map(preset => {
            const isActive = activePreset === preset.label
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                style={{
                  fontSize: enlarged ? 15 : 14,
                  padding: enlarged ? "4px 10px" : "3px 8px",
                  borderRadius: "9999px",
                  border: `1px solid ${isActive ? "oklch(0.55 0.15 22)" : "oklch(0.30 0.01 260)"}`,
                  background: isActive ? "oklch(0.30 0.12 22)" : "transparent",
                  color: isActive ? "oklch(0.88 0.07 28)" : "var(--foreground)",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.6,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)"
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.45 0.01 260)"
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)"
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.30 0.01 260)"
                  }
                }}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Chart */}
      <div ref={chartRef} style={fillHeight ? { flex: 1, minHeight: 0, position: "relative", userSelect: "none" } : { height, userSelect: "none" }}>
        <div style={fillHeight ? { position: "absolute", inset: 0 } : { height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 8, right: canDualAxis ? (enlarged ? 8 : 4) : 16, left: 4, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" vertical={false} />
            <XAxis dataKey="_ms" type="number" domain={["dataMin", "dataMax"]} scale="linear" tickCount={5} tickFormatter={xTickFormatter} tick={{ fill: "var(--chart-axis)", fontSize: enlarged ? 16 : 14 }} axisLine={{ stroke: "var(--chart-axis)" }} tickLine={{ stroke: "var(--chart-axis)" }} label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -10, fill: "var(--chart-axis)", fontSize: enlarged ? 17 : 15 } : undefined} />
            {canDualAxis && <YAxis yAxisId="left" orientation="left" domain={axisDomain(leftSeries)} allowDecimals={axisAllowDecimals(leftSeries)} tickFormatter={axisTickFmt(leftSeries)} tick={{ fill: leftAxisColor, fontSize: enlarged ? 16 : 14 }} axisLine={{ stroke: leftAxisColor }} tickLine={{ stroke: leftAxisColor }} width={enlarged ? 153 : 141} label={leftAxisLabel ? <BiLineAxisLabel value={leftAxisLabel} angle={-90} fill={leftAxisColor} fontSize={axisLabelFs} /> : undefined} />}
            {canDualAxis && <YAxis yAxisId="right" orientation="right" domain={axisDomain(rightSeries)} allowDecimals={axisAllowDecimals(rightSeries)} tickFormatter={axisTickFmt(rightSeries)} tick={{ fill: rightAxisColor, fontSize: enlarged ? 16 : 14 }} axisLine={{ stroke: rightAxisColor }} tickLine={{ stroke: rightAxisColor }} width={enlarged ? 207 : 190} label={rightAxisLabel ? <BiLineAxisLabel value={rightAxisLabel} angle={90} fill={rightAxisColor} fontSize={axisLabelFs} /> : undefined} />}
            {!canDualAxis && <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))} tick={{ fill: "var(--chart-axis)", fontSize: enlarged ? 16 : 14 }} axisLine={{ stroke: "var(--chart-axis)" }} tickLine={{ stroke: "var(--chart-axis)" }} width={enlarged ? 112 : 96} label={effectiveYAxisLabel ? { value: effectiveYAxisLabel, angle: -90, position: "center", fill: "var(--chart-axis)", fontSize: enlarged ? 17 : 15 } : undefined} />}
            <Tooltip content={<ChartTooltip seriesColors={seriesColors} />} />
            {series.map((s, i) => {
              const color = SERIES_COLORS[i % SERIES_COLORS.length]
              const isHidden = hidden.has(s.title)
              const axisId = getAxisId(s)
              const yAxisProp = axisId !== undefined ? { yAxisId: axisId } : {}
              return [
                hasCIData(s) ? (
                  <Area key={`${s.title}_ci_base`} type="monotone" dataKey={`${s.title}_ci_base`}
                    {...yAxisProp}
                    stackId={`ci_${s.title}`} stroke="none" fill="transparent" legendType="none"
                    connectNulls hide={isHidden} isAnimationActive={animationActive} />
                ) : null,
                hasCIData(s) ? (
                  <Area key={`${s.title}_ci_band`} type="monotone" dataKey={`${s.title}_ci_band`}
                    {...yAxisProp}
                    stackId={`ci_${s.title}`} stroke="none" fill={color} fillOpacity={0.15}
                    legendType="none" connectNulls hide={isHidden} isAnimationActive={animationActive} />
                ) : null,
                <Line key={s.title} type="monotone" dataKey={s.title} {...yAxisProp}
                  stroke={color} strokeWidth={isDark ? 3 : 4}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, index } = props as { cx: number; cy: number; index: number }
                    const prev = visibleData[index - 1]?.[s.title]
                    const next = visibleData[index + 1]?.[s.title]
                    const isolated = (prev == null) && (next == null)
                    const isLastLive = isLive && index === visibleData.length - 1
                    if (isLastLive) {
                      return (
                        <g key={`dot-${s.title}-${index}`}>
                          <circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={2}>
                            <animate attributeName="r" values="5;14;5" dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                          <circle cx={cx} cy={cy} r={5} fill={color} />
                        </g>
                      )
                    }
                    return isolated
                      ? <circle key={`dot-${s.title}-${index}`} cx={cx} cy={cy} r={5} fill={color} />
                      : <g key={`dot-${s.title}-${index}`} />
                  }}
                  activeDot={{ r: 6 }} connectNulls hide={isHidden} isAnimationActive={animationActive} />,
              ]
            })}
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Scrubber */}
      {!compact && total > 0 && (
        <div className="px-1 space-y-1">
          <div
            ref={scrubberRef}
            className="relative w-full"
            style={{ height: 20, cursor: "default" }}
            onMouseDown={onTrackMouseDown}
          >
            {/* Track */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: 12,
                transform: "translateY(-50%)",
                borderRadius: "9999px",
                background: "var(--muted)",
                overflow: "hidden",
              }}
            >
              {/* Thumb fill */}
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

            {/* Left handle */}
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
                border: "1.5px solid oklch(0.72 0.14 26)",
                cursor: "col-resize",
                zIndex: 2,
                boxSizing: "border-box",
              }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e, "left") }}
            />

            {/* Right handle */}
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
                border: "1.5px solid oklch(0.72 0.14 26)",
                cursor: "col-resize",
                zIndex: 2,
                boxSizing: "border-box",
              }}
              onMouseDown={e => { e.stopPropagation(); startDrag(e, "right") }}
            />
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {statusLabel}
            </span>
            {isLive && (
              <span className="text-xs flex items-center gap-1" style={{ color: "oklch(0.65 0.18 160)" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.18 160)" }} />
                Live
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
