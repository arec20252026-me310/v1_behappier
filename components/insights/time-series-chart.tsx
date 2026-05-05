"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

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
  // Use the longest labels array as the x-axis spine
  const base = series.reduce((a, b) => (b.labels.length > a.labels.length ? b : a))
  return base.labels.map((label, i) => {
    const point: Record<string, unknown> = { name: formatLabel(label) }
    series.forEach(s => {
      point[s.title] = s.values[i] ?? null
    })
    return point
  })
}

export function TimeSeriesChart({ series, height = 280 }: TimeSeriesChartProps) {
  if (!series.length) return null
  const data = mergeSeriesData(series)

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
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
            width={42}
            tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "oklch(0.65 0 0)" }}
          />
          {series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: "oklch(0.65 0 0)", paddingTop: 8 }}
            />
          )}
          {series.map((s, i) => (
            <Line
              key={s.title}
              type="monotone"
              dataKey={s.title}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
