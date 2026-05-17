"use client"

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { FitResult } from "@/lib/model-fitting"

interface ModelChartProps {
  xValues: number[]
  yValues: number[]
  fitResult: FitResult | null
  xLabel?: string
  yLabel?: string
}

const DATA_COLOR = "oklch(0.7 0.15 180)"   // teal
const FIT_COLOR  = "oklch(0.75 0.18 60)"   // amber/orange

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

export function ModelChart({ xValues, yValues, fitResult, xLabel, yLabel }: ModelChartProps) {
  if (xValues.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
        No data to display. Upload a dataset and select columns.
      </div>
    )
  }

  // Build scatter data
  const scatterData = xValues.map((x, i) => ({ x, y: yValues[i] }))

  // Build fit line data — sample 200 evenly spaced points
  type FitPoint = { x: number; fit: number }
  let fitData: FitPoint[] = []
  if (fitResult && fitResult.predictedY.length === xValues.length) {
    const step = Math.max(1, Math.floor(xValues.length / 200))
    for (let i = 0; i < xValues.length; i += step) {
      fitData.push({ x: xValues[i], fit: fitResult.predictedY[i] })
    }
    // Always include last point
    const last = xValues.length - 1
    if (fitData[fitData.length - 1]?.x !== xValues[last]) {
      fitData.push({ x: xValues[last], fit: fitResult.predictedY[last] })
    }
    fitData.sort((a, b) => a.x - b.x)
  }

  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)

  const xTickFormatter = (v: number) => formatSeconds(v - xMin)

  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 24, left: 8, bottom: 36 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[xMin, xMax]}
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
              const point = payload[0]?.payload as { x?: number; y?: number; fit?: number }
              return (
                <div style={TOOLTIP_STYLE}>
                  {point.x !== undefined && (
                    <p style={{ color: "#9ca3af", marginBottom: 2 }}>
                      T+{formatSeconds((point.x ?? 0) - xMin)}
                    </p>
                  )}
                  {point.y !== undefined && (
                    <p style={{ color: DATA_COLOR }}>
                      Data: {(point.y ?? 0).toFixed(4)}
                    </p>
                  )}
                  {point.fit !== undefined && (
                    <p style={{ color: FIT_COLOR }}>
                      Fit: {(point.fit ?? 0).toFixed(4)}
                    </p>
                  )}
                </div>
              )
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>
            )}
          />

          {/* Raw data points */}
          <Scatter
            name="Data"
            data={scatterData}
            dataKey="y"
            fill={DATA_COLOR}
            opacity={0.7}
            r={3}
          />

          {/* Fitted curve */}
          {fitData.length > 0 && (
            <Line
              name="Fit"
              data={fitData}
              dataKey="fit"
              stroke={FIT_COLOR}
              strokeWidth={2}
              dot={false}
              type="monotone"
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
