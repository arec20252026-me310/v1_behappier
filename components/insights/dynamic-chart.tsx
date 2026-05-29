"use client"

import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"

const COLORS = {
  line:       "oklch(0.60 0.17 22)",   // --chart-1 (crimson)
  bar:        "oklch(0.60 0.18 148)",  // --chart-2 (green)
  grid:       "oklch(0.28 0.01 260)",  // approx --border
  axis:       "#64748b",               // slate-500 — readable on both light and dark
  tooltipBg:  "oklch(0.17 0.01 260)", // --card (dark)
  tooltipBdr: "oklch(0.28 0.01 260)",
  tooltipTxt: "oklch(0.95 0 0)",       // --foreground (dark)
}

const TOOLTIP_STYLE = {
  backgroundColor: COLORS.tooltipBg,
  border: `1px solid ${COLORS.tooltipBdr}`,
  borderRadius: "0.5rem",
  color: COLORS.tooltipTxt,
  fontSize: 11,
}

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
      <table className="w-full text-sm border-collapse">
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
                const alpha = val == null ? 0 : val
                return (
                  <td
                    key={ci}
                    className="p-1 text-center"
                    title={val == null ? "null" : String(val)}
                    style={{ background: `oklch(0.7 0.15 200 / ${Math.round(alpha * 100)}%)`, color: COLORS.tooltipTxt }}
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
      <p className="text-sm font-medium text-muted-foreground">{title}</p>

      {chart_type === "heatmap" ? (
        <HeatmapChart labels={labels} values={values as (number | null)[][]} />
      ) : chart_type === "bar" ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={toRechartsData(labels, values as (number | null)[])}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="name" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.axis }} />
              <Bar dataKey="value" fill={COLORS.bar} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={toRechartsData(labels, values as (number | null)[])}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="name" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} width={36} domain={[0, 1]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.axis }} />
              <Line type="monotone" dataKey="value" stroke={COLORS.line} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
