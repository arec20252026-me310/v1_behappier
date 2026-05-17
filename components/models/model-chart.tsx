"use client"

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
}

interface ModelChartProps {
  xValues: number[]
  yValues: number[]
  fitEntries: FitEntry[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  xLabel?: string
  yLabel?: string
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

function formatSeconds(s: number): string {
  if (!isFinite(s)) return ""
  const absS = Math.abs(s)
  const h = Math.floor(absS / 3600)
  const m = Math.floor((absS % 3600) / 60)
  const sec = Math.floor(absS % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`
  if (m > 0) return `${m}m${String(sec).padStart(2, "0")}s`
  return `${sec}s`
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
  xLabel,
  yLabel,
}: ModelChartProps) {
  if (xValues.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
        No data to display. Upload a dataset and select columns.
      </div>
    )
  }

  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const xTickFormatter = (v: number) => formatSeconds(v - xMin)

  const scatterData = xValues.map((x, i) => ({ x, raw: yValues[i] }))

  // Build per-entry line data
  const entryLines = fitEntries
    .filter((e) => e.visible && e.fitResult.predictedY.length > 0)
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

  // Unified domain across all x values
  const allX = [
    ...xValues,
    ...fitEntries.flatMap((e) => e.xValues),
  ]
  const domainMin = Math.min(...allX)
  const domainMax = Math.max(...allX)

  return (
    <div className="space-y-3">
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 24, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[domainMin, domainMax]}
              scale="linear"
              tickCount={6}
              tickFormatter={xTickFormatter}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={{ stroke: "#9ca3af" }}
              tickLine={{ stroke: "#9ca3af" }}
              label={
                xLabel
                  ? { value: xLabel, position: "insideBottom", offset: -10, fill: "#9ca3af", fontSize: 11 }
                  : undefined
              }
            />
            <YAxis
              type="number"
              tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={{ stroke: "#9ca3af" }}
              tickLine={{ stroke: "#9ca3af" }}
              width={56}
              label={
                yLabel
                  ? { value: yLabel, angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }
                  : undefined
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0]?.payload as Record<string, number>
                const x = point.x
                return (
                  <div style={TOOLTIP_STYLE}>
                    <p style={{ color: "#9ca3af", marginBottom: 4 }}>
                      T+{formatSeconds((x ?? 0) - xMin)}
                    </p>
                    {point.raw !== undefined && (
                      <p style={{ color: DATA_COLOR }}>Data: {point.raw.toFixed(4)}</p>
                    )}
                    {entryLines.map(({ entry }) =>
                      point[entry.id] !== undefined ? (
                        <p key={entry.id} style={{ color: entry.color }}>
                          {entry.label}: {point[entry.id].toFixed(4)}
                        </p>
                      ) : null
                    )}
                  </div>
                )
              }}
            />

            {/* Raw data scatter */}
            <Scatter
              name="Data"
              data={scatterData}
              dataKey="raw"
              fill={DATA_COLOR}
              opacity={0.6}
              r={3}
            />

            {/* One line per fit entry */}
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
          </ComposedChart>
        </ResponsiveContainer>
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
            return (
              <div key={entry.id} className="flex items-center gap-2 px-1">
                <button
                  onClick={() => onToggle(entry.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left group"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0 transition-opacity"
                    style={{
                      background: entry.color,
                      opacity: entry.visible ? 1 : 0.25,
                      outline: entry.visible ? `2px solid ${entry.color}` : "2px solid transparent",
                      outlineOffset: 1,
                    }}
                  />
                  <span
                    className="text-xs truncate transition-opacity"
                    style={{ color: entry.visible ? entry.color : "#6b7280" }}
                  >
                    {entry.label}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto pr-2">
                    R²={isFinite(r2) ? r2.toFixed(3) : "—"}
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
