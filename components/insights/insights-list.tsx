"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Target, BarChart3, Table2 } from "lucide-react"
import type { BEInsightOutput } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface InsightsListProps {
  outputs: BEInsightOutput[]
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value === null || value === undefined) return []
  return [value as T]
}

function normalizeOutput(output: BEInsightOutput): BEInsightOutput {
  return {
    ...output,
    insights: toArray<string>(output.insights),
    recommendations: toArray<string>(output.recommendations),
    charts: toArray(output.charts),
    tables: toArray(output.tables),
  }
}

export function InsightsList({ outputs }: InsightsListProps) {
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

              {/* Charts & tables tally */}
              {(output.charts.length > 0 || output.tables.length > 0) && (
                <div className="flex items-center gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
                  {output.charts.length > 0 && (
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {output.charts.length} chart{output.charts.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {output.tables.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Table2 className="h-3.5 w-3.5" />
                      {output.tables.length} table{output.tables.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
