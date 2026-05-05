"use client"

import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface N8nChartData {
  labels: string[]
  values: (number | null)[] | (number | null)[][]
}

interface DynamicChartProps {
  chart_type: string
  title: string
  data: N8nChartData
}

function formatLabel(label: string): string {
  // Shorten ISO timestamps to HH:MM:SS, leave short strings as-is
  if (label.includes("T") && label.length > 15) {
    const d = new Date(label)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    }
  }
  return label
}

function toRechartsData(labels: string[], values: (number | null)[]) {
  return labels.map((label, i) => ({
    name: formatLabel(label),
    value: values[i] ?? null,
  }))
}

function HeatmapChart({ labels, values }: { labels: string[]; values: (number | null)[][] }) {
  const numCols = values[0]?.length ?? 0
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left p-1 text-muted-foreground font-normal">Time</th>
            {Array.from({ length: numCols }, (_, i) => (
              <th key={i} className="p-1 text-muted-foreground font-normal text-center">
                B{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, ri) => (
            <tr key={ri}>
              <td className="p-1 text-muted-foreground whitespace-nowrap">{formatLabel(label)}</td>
              {(values[ri] ?? []).map((val, ci) => {
                const intensity = val == null ? 0 : Math.round(val * 100)
                return (
                  <td
                    key={ci}
                    className="p-1 text-center rounded"
                    title={val == null ? "null" : String(val)}
                    style={{ background: `hsla(var(--chart-1) / ${intensity}%)` }}
                  >
                    {val == null ? "—" : val.toFixed(2)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DynamicChart({ chart_type, title, data }: DynamicChartProps) {
  const { labels, values } = data

  if (!labels?.length || !values?.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>

      {chart_type === "heatmap" ? (
        <HeatmapChart labels={labels} values={values as (number | null)[][]} />
      ) : chart_type === "bar" ? (
        <ChartContainer config={{ value: { label: title, color: "hsl(var(--chart-2))" } }} className="h-48">
          <BarChart data={toRechartsData(labels, values as (number | null)[])}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      ) : (
        // default: line
        <ChartContainer config={{ value: { label: title, color: "hsl(var(--chart-1))" } }} className="h-48">
          <LineChart data={toRechartsData(labels, values as (number | null)[])}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={32} domain={[0, 1]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  )
}
