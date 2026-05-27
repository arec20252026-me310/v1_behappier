"use client"

import { useState } from "react"
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import type { FitResult } from "@/lib/model-fitting"
import { X } from "lucide-react"

export interface FitEntry {
  id: string
  label: string
  color: string
  visible: boolean
  xValues: number[]
  yValues: number[]
  fitResult: FitResult
  inputCount: number
  inputCols: string[]
  outputCol: string
  inputValues: Record<string, number[]>  // col name → values at valid indices
}

interface ModelChartProps {
  xValues: number[]
  yValues: number[]
  fitEntries: FitEntry[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  xIsTime?: boolean
  yIsTime?: boolean
  xLabel?: string   // raw column name — used for axis-match detection
  yLabel?: string
  xAxisLabel?: string  // display label shown on the chart axis and tooltip
  yAxisLabel?: string
}

const DATA_COLOR = "oklch(0.7 0.15 180)"

export const FIT_COLORS = [
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#3b82f6",
  "#f97316",
  "#ec4899",
  "#a3e635",
  "#06b6d4",
]

function makeElapsedFormatter(maxSec: number): (v: number) => string {
  if (maxSec < 180) return (v) => `${Math.round(v)}`
  if (maxSec < 7200) return (v) => `${Math.round(v / 60)}`
  if (maxSec < 172800) return (v) => `${(v / 3600).toFixed(1)}`
  return (v) => `${(v / 86400).toFixed(1)}`
}

function makeElapsedTooltipFormatter(maxSec: number): (v: number) => string {
  if (maxSec < 180) return (v) => v.toFixed(2)
  if (maxSec < 7200) return (v) => (v / 60).toFixed(2)
  if (maxSec < 172800) return (v) => (v / 3600).toFixed(2)
  return (v) => (v / 86400).toFixed(2)
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "oklch(0.17 0.01 260)",
  border: "1px solid oklch(0.28 0.01 260)",
  borderRadius: "0.5rem",
  color: "oklch(0.95 0 0)",
  fontSize: 11,
  padding: "6px 10px",
}

export function ModelChart({
  xValues,
  yValues,
  fitEntries,
  onToggle,
  onRemove,
  xIsTime = false,
  yIsTime = false,
  xLabel,
  yLabel,
  xAxisLabel,
  yAxisLabel,
}: ModelChartProps) {
  const [hoveredDot, setHoveredDot] = useState<{ cx: number; cy: number; x: number; raw: number } | null>(null)

  if (xValues.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
        No data to display. Upload a dataset and select columns.
      </div>
    )
  }

  // Convert timestamps to elapsed seconds so chart axes align with model fits
  const xRawMin = xValues.length > 0 ? Math.min(...xValues.filter(isFinite)) : 0
  const xValuesDisplay = xIsTime
    ? xValues.map(x => (isFinite(x) ? x - xRawMin : x))
    : xValues

  const yRawMin = yIsTime && yValues.length > 0 ? Math.min(...yValues.filter(isFinite)) : 0
  const yValuesDisplay = yIsTime
    ? yValues.map(y => (isFinite(y) ? y - yRawMin : y))
    : yValues

  const xMaxElapsed = xIsTime && xValuesDisplay.length > 0 ? Math.max(...xValuesDisplay.filter(isFinite)) : 0
  const yMaxElapsed = yIsTime && yValuesDisplay.length > 0 ? Math.max(...yValuesDisplay.filter(isFinite)) : 0

  const xElapsedFmt = makeElapsedFormatter(xMaxElapsed)
  const yElapsedFmt = makeElapsedFormatter(yMaxElapsed)
  const xElapsedTooltipFmt = makeElapsedTooltipFormatter(xMaxElapsed)
  const yElapsedTooltipFmt = makeElapsedTooltipFormatter(yMaxElapsed)

  const xTickFormatter = xIsTime
    ? (v: unknown) => xElapsedFmt(Number(v))
    : (v: unknown) => {
        const n = Number(v)
        if (!isFinite(n)) return ""
        return Number.isInteger(n) ? String(n) : n.toFixed(1)
      }

  const yTickFormatter = yIsTime
    ? (v: number) => yElapsedFmt(v)
    : (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))

  const scatterData = xValuesDisplay.map((x, i) => ({ x, raw: yValuesDisplay[i] }))

  // Multi-input fits: project onto chart X axis only if xLabel is one of the inputs
  const entryScatters = fitEntries
    .filter((e) => e.visible && e.inputCount > 1 && !!xLabel && e.inputCols.includes(xLabel) && !!yLabel && e.outputCol === yLabel && e.fitResult.predictedY.length > 0)
    .map((entry) => {
      const projX = (xLabel ? entry.inputValues[xLabel] : undefined) ?? entry.xValues
      return {
        entry,
        pts: projX.map((x, i) => ({ x, [entry.id]: entry.fitResult.predictedY[i] })),
      }
    })

  // Single-input fits: smooth line — only when both axes match the model's input/output
  const entryLines = fitEntries
    .filter((e) =>
      e.visible &&
      e.inputCount === 1 &&
      e.fitResult.predictedY.length > 0 &&
      !!xLabel && e.inputCols[0] === xLabel &&
      !!yLabel && e.outputCol === yLabel
    )
    .map((entry) => {
      const step = Math.max(1, Math.floor(entry.xValues.length / 200))
      const pts: { x: number; [key: string]: number }[] = []
      for (let i = 0; i < entry.xValues.length; i += step) {
        pts.push({ x: entry.xValues[i], [entry.id]: entry.fitResult.predictedY[i] })
      }
      const last = entry.xValues.length - 1
      if (pts[pts.length - 1]?.x !== entry.xValues[last]) {
        pts.push({ x: entry.xValues[last], [entry.id]: entry.fitResult.predictedY[last] })
      }
      pts.sort((a, b) => a.x - b.x)
      return { entry, pts }
    })

  // Domain derived only from what is actually rendered — autoscales when axis selection changes
  const renderedX = [
    ...xValuesDisplay,
    ...entryLines.flatMap(({ pts }) => pts.map((p) => p.x)),
    ...entryScatters.flatMap(({ pts }) => pts.map((p) => p.x)),
  ].filter(isFinite)
  const renderedY = [
    ...yValuesDisplay,
    ...entryLines.flatMap(({ entry }) => entry.fitResult.predictedY),
    ...entryScatters.flatMap(({ entry }) => entry.fitResult.predictedY),
  ].filter(isFinite)

  function paddedDomain(vals: number[]): [number, number] {
    if (vals.length === 0) return [0, 1]
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const pad = (hi - lo) * 0.05 || Math.abs(lo) * 0.05 || 1
    return [lo - pad, hi + pad]
  }

  const [xDomainMin, xDomainMax] = paddedDomain(renderedX)
  const [yDomainMin, yDomainMax] = paddedDomain(renderedY)

  const TICK_COUNT = 6
  const rawXRange = renderedX.length > 0
    ? Math.max(...renderedX) - Math.min(...renderedX)
    : 0
  const xTicks = rawXRange === 0
    ? (renderedX.length > 0 ? [renderedX[0]] : [0])
    : Array.from({ length: TICK_COUNT }, (_, i) =>
        xDomainMin + (i / (TICK_COUNT - 1)) * (xDomainMax - xDomainMin)
      )

  return (
    <div className="space-y-3">
      <div style={{ height: 300, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 24, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xDomainMin, xDomainMax]}
              scale="linear"
              ticks={xTicks}
              tickFormatter={xTickFormatter}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={{ stroke: "#9ca3af" }}
              tickLine={{ stroke: "#9ca3af" }}
              label={
                (xAxisLabel ?? xLabel)
                  ? { value: xAxisLabel ?? xLabel, position: "insideBottom", offset: -10, fill: "#9ca3af", fontSize: 11 }
                  : undefined
              }
            />
            <YAxis
              type="number"
              domain={[yDomainMin, yDomainMax]}
              tickFormatter={yTickFormatter}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={{ stroke: "#9ca3af" }}
              tickLine={{ stroke: "#9ca3af" }}
              width={56}
              label={
                (yAxisLabel ?? yLabel)
                  ? { value: yAxisLabel ?? yLabel, angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }
                  : undefined
              }
            />

            {/* Raw data scatter */}
            <Scatter
              name="Data"
              data={scatterData}
              dataKey="raw"
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { x: number; raw: number } }
                const isHovered = hoveredDot?.cx === cx && hoveredDot?.cy === cy
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : 5}
                    fill={DATA_COLOR}
                    opacity={0.6}
                    style={{ cursor: "default" }}
                    onMouseEnter={() => setHoveredDot({ cx, cy, x: payload.x, raw: payload.raw })}
                    onMouseLeave={() => setHoveredDot(null)}
                  />
                )
              }}
            />

            {/* Single-input fits: smooth line */}
            {entryLines.map(({ entry, pts }) => (
              <Line
                key={entry.id}
                name={entry.label}
                data={pts}
                dataKey={entry.id}
                stroke={entry.color}
                strokeWidth={2}
                dot={false}
                type="monotone"
                isAnimationActive={false}
              />
            ))}

            {/* Multi-input fits: projected scatter dots at chart-X positions */}
            {entryScatters.map(({ entry, pts }) => (
              <Scatter
                key={entry.id}
                name={entry.label}
                data={pts}
                dataKey={entry.id}
                fill={entry.color}
                opacity={0.7}
                r={4}
                isAnimationActive={false}
              />
            ))}

          </ComposedChart>
        </ResponsiveContainer>

        {hoveredDot && (
          <div
            style={{
              ...TOOLTIP_STYLE,
              position: "absolute",
              left: hoveredDot.cx + 12,
              top: Math.max(0, hoveredDot.cy - 40),
              pointerEvents: "none",
              zIndex: 10,
              whiteSpace: "nowrap",
            }}
          >
            <p style={{ color: "#9ca3af", marginBottom: 2 }}>
              {`${xAxisLabel ?? xLabel ?? "X"}: ${xIsTime ? xElapsedTooltipFmt(hoveredDot.x) : hoveredDot.x.toFixed(2)}`}
            </p>
            <p style={{ color: DATA_COLOR }}>
              {yAxisLabel ?? yLabel ?? "Y"}: {yIsTime ? yElapsedTooltipFmt(hoveredDot.raw) : hoveredDot.raw.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Custom legend */}
      {fitEntries.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          {/* Data row */}
          <div className="flex items-center gap-2 px-1">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ background: DATA_COLOR }}
            />
            <span className="text-xs text-muted-foreground flex-1">Raw data</span>
          </div>

          {fitEntries.map((entry) => {
            const r2 = entry.fitResult.metrics.r2
            // Axis match is independent of visibility toggle
            const axisMatches = entry.inputCount === 1
              ? (!!xLabel && entry.inputCols[0] === xLabel && !!yLabel && entry.outputCol === yLabel)
              : (!!xLabel && entry.inputCols.includes(xLabel) && !!yLabel && entry.outputCol === yLabel)
            const axisMismatch = !axisMatches
            const effectivelyVisible = entry.visible && axisMatches

            return (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-1"
                title={axisMismatch ? "Not shown — select matching X and Y axes" : undefined}
              >
                <button
                  onClick={() => !axisMismatch && onToggle(entry.id)}
                  disabled={axisMismatch}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left group disabled:cursor-not-allowed"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0 transition-opacity"
                    style={{
                      background: entry.color,
                      opacity: effectivelyVisible ? 1 : 0.25,
                      outline: effectivelyVisible ? `2px solid ${entry.color}` : "2px solid transparent",
                      outlineOffset: 1,
                    }}
                  />
                  <span
                    className="text-xs truncate transition-opacity"
                    style={{ color: effectivelyVisible ? entry.color : "#6b7280" }}
                  >
                    {entry.label}
                  </span>
                  <span className="text-xs shrink-0 ml-auto pr-2" style={{ color: axisMismatch ? "#6b7280" : undefined }}>
                    {axisMismatch
                      ? "axis mismatch"
                      : `R²=${isFinite(r2) ? r2.toFixed(3) : "—"}`}
                  </span>
                </button>
                <button
                  onClick={() => onRemove(entry.id)}
                  className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
