"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import Link from "next/link"
import type { BEInsightOutput } from "@/lib/types"
import { TimeSeriesChart } from "@/components/insights/time-series-chart"
import type { ChartSeries } from "@/components/insights/time-series-chart"

interface OccupancyChartProps {
  latestOutput?: BEInsightOutput | null
  studyDurationMs?: number
}

function extractLineSeries(output: BEInsightOutput): ChartSeries[] {
  const charts = Array.isArray(output.charts) ? output.charts : []
  return charts
    .filter(c => (c as Record<string, unknown>).chart_type === "line")
    .map(c => {
      const ch = c as Record<string, unknown>
      const d = ch.data as { labels: string[]; values: (number | null)[]; lower?: (number | null)[]; upper?: (number | null)[] }
      return { title: ch.title as string, labels: d?.labels ?? [], values: d?.values ?? [], lower: d?.lower, upper: d?.upper }
    })
    .filter(s => s.labels.length > 0)
}

export function OccupancyChart({ latestOutput, studyDurationMs }: OccupancyChartProps) {
  const series = latestOutput ? extractLineSeries(latestOutput) : []

  if (!series.length) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-base font-medium">Occupancy Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No occupancy data yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Start a study to begin collecting data
            </p>
            <Link href="/dashboard/studies">
              <Button size="sm">Create Study</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border pt-2 pb-4">
      <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Occupancy Over Time</CardTitle>
        <Link href="/dashboard/insights">
          <Button variant="ghost" size="sm" className="text-xs">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <TimeSeriesChart series={series} height={350} studyDurationMs={studyDurationMs} />
      </CardContent>
    </Card>
  )
}
