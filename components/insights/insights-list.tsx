"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Target, BarChart3, Table2 } from "lucide-react"
import type { BEInsightOutput } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { DynamicChart } from "./dynamic-chart"
import { TimeSeriesChart } from "./time-series-chart"
import type { ChartSeries } from "./time-series-chart"
import { ReviewTable } from "./review-table"

export interface DetectionRow {
  id: string
  study_id: string
  image_id: string
  timestamp_pt: string | null
  notes: string | null
}

interface InsightsListProps {
  outputs: BEInsightOutput[]
  detectionsByStudy?: Record<string, DetectionRow[]>
  reviewMode?: boolean
  studyDurations?: Record<string, number>
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value === null || value === undefined) return []
  return [value as T]
}

type NormalizedOutput = Omit<BEInsightOutput, 'insights' | 'recommendations'> & {
  insights: string[]
  recommendations: string[]
}

function normalizeOutput(output: BEInsightOutput): NormalizedOutput {
  return {
    ...output,
    insights: toArray<string>(output.insights),
    recommendations: toArray<string>(output.recommendations),
    charts: toArray(output.charts),
    tables: toArray(output.tables),
  }
}

export function InsightsList({ outputs, detectionsByStudy = {}, reviewMode = false, studyDurations = {} }: InsightsListProps) {
  const normalized = outputs.map(normalizeOutput)
  if (normalized.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Insights Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Insights are generated automatically as your studies collect and analyze behavioral data.
            Start a study to begin.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Study Insights</h2>
        <p className="text-sm text-muted-foreground">
          {normalized.length} insight report{normalized.length !== 1 ? "s" : ""} generated
        </p>
      </div>

      <div className="space-y-4">
        {normalized.map(output => (
          <Card key={output.id} className="bg-card border-border">
            <CardContent className="p-5 space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={output.output_mode === "final_insights" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {output.output_mode === "final_insights" ? "Final Insights" : "Milestone Summary"}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground capitalize">
                    {output.status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(output.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Study reference */}
              <p className="text-xs text-muted-foreground font-mono">
                Study: {output.study_id}
              </p>

              {/* Summary */}
              {output.dashboard_summary && (
                <p className="text-sm text-foreground leading-relaxed">
                  {output.dashboard_summary}
                </p>
              )}

              {/* Key findings */}
              {output.insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="h-3.5 w-3.5 text-chart-4" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Key Findings
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {output.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-chart-4 mt-1.5 shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {output.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="h-3.5 w-3.5 text-chart-2" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Recommendations
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {output.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-chart-2 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Charts — line charts combined, others individual */}
              {output.charts.length > 0 && (() => {
                const lineSeries: ChartSeries[] = output.charts
                  .filter(c => (c as Record<string, unknown>).chart_type === "line")
                  .map(c => {
                    const ch = c as Record<string, unknown>
                    const d = ch.data as { labels: string[]; values: (number | null)[]; lower?: (number | null)[]; upper?: (number | null)[] }
                    return { title: ch.title as string, labels: d.labels, values: d.values, lower: d.lower, upper: d.upper }
                  })
                const otherCharts = output.charts.filter(
                  c => (c as Record<string, unknown>).chart_type !== "line"
                )
                return (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-chart-1" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Charts
                      </p>
                    </div>
                    {lineSeries.length > 0 && <TimeSeriesChart series={lineSeries} height={240} studyDurationMs={studyDurations[output.study_id]} />}
                    {otherCharts.map((chart, i) => (
                      <DynamicChart
                        key={(chart as Record<string, unknown>).chart_id as string ?? i}
                        chart_type={(chart as Record<string, unknown>).chart_type as string ?? "bar"}
                        title={(chart as Record<string, unknown>).title as string ?? ""}
                        data={(chart as Record<string, unknown>).data as { labels: string[]; values: (number | null)[] | (number | null)[][] }}
                      />
                    ))}
                  </div>
                )
              })()}

              {/* Tables */}
              {output.tables.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Table2 className="h-3.5 w-3.5 text-chart-3" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Detection Log
                    </p>
                  </div>
                  {output.tables.map((table, i) => {
                    const t = table as Record<string, unknown>
                    const columns = t.columns as string[]
                    const rows = t.rows as string[][]
                    const title = t.title as string
                    const studyDetections = detectionsByStudy[output.study_id] ?? []

                    if (reviewMode) {
                      return (
                        <ReviewTable
                          key={t.table_id as string ?? i}
                          columns={columns}
                          rows={rows}
                          detections={studyDetections}
                          title={title}
                        />
                      )
                    }

                    return (
                      <div key={t.table_id as string ?? i} className="space-y-1.5">
                        {title && <p className="text-xs text-muted-foreground">{title}</p>}
                        <div className="overflow-x-auto rounded border border-border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                {columns.map((col, ci) => (
                                  <th key={ci} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, ri) => (
                                <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/20">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-2 py-1.5 text-foreground/80">
                                      {cell ?? "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
