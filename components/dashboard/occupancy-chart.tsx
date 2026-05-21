"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"
import Link from "next/link"
import type { BEInsightOutput } from "@/lib/types"
import { TimeSeriesChart } from "@/components/insights/time-series-chart"
import type { ChartSeries } from "@/components/insights/time-series-chart"
import { createClient } from "@/lib/supabase/client"
import type { DetectionRow } from "@/components/studies/live-detection-feed"

interface OccupancyChartProps {
  latestOutput?: BEInsightOutput | null
  studyDurationMs?: number
  metricDescriptions?: Record<string, string>
  activeStudyId?: string
  demoDetections?: DetectionRow[]
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

function buildLiveSeries(detections: DetectionRow[]): ChartSeries[] {
  // Group rows by behavior name, use timestamp_pt as labels
  const seriesMap = new Map<string, { labels: string[]; values: (number | null)[] }>()

  for (const row of detections) {
    const behaviors = Array.isArray(row.detected_behaviors) ? row.detected_behaviors : []
    for (const b of behaviors) {
      const name = b.name
      const rawVal = b.value
      const numVal = typeof rawVal === "number" ? rawVal : Number(rawVal)
      if (isNaN(numVal)) continue

      if (!seriesMap.has(name)) {
        seriesMap.set(name, { labels: [], values: [] })
      }
      const entry = seriesMap.get(name)!
      entry.labels.push(row.timestamp_pt)
      entry.values.push(numVal)
    }
  }

  return Array.from(seriesMap.entries()).map(([title, { labels, values }]) => ({
    title,
    labels,
    values,
  }))
}

export function OccupancyChart({
  latestOutput,
  studyDurationMs,
  metricDescriptions,
  activeStudyId,
  demoDetections,
}: OccupancyChartProps) {
  const [liveDetections, setLiveDetections] = useState<DetectionRow[]>([])
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  useEffect(() => {
    // Reset live detections when activeStudyId changes
    setLiveDetections([])

    if (!activeStudyId) return

    // Demo mode: use provided detections, no Supabase subscription
    if (demoDetections) {
      setLiveDetections(demoDetections)
      return
    }

    // Real mode: subscribe to Supabase realtime
    const supabase = createClient()

    async function loadInitial() {
      const { data } = await supabase
        .from("BE_behavior_detections")
        .select("timestamp_pt, detected_behaviors, notes")
        .eq("study_id", activeStudyId)
        .order("timestamp", { ascending: true })
        .limit(200)
      if (data) setLiveDetections(data as DetectionRow[])
    }

    loadInitial()

    const channel = supabase
      .channel("occupancy-chart-live-" + activeStudyId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "BE_behavior_detections",
          filter: `study_id=eq.${activeStudyId}`,
        },
        (payload) => {
          setLiveDetections(prev => [...prev, payload.new as DetectionRow])
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [activeStudyId, demoDetections])

  const isLive = !!activeStudyId
  const liveSeries = isLive ? buildLiveSeries(liveDetections) : []
  const fallbackSeries = latestOutput ? extractLineSeries(latestOutput) : []
  const series = isLive ? liveSeries : fallbackSeries

  // Empty state: no live study and no historical data
  if (!isLive && !series.length) {
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

  // Empty state: live study active but no detections yet
  if (isLive && liveDetections.length === 0) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Occupancy Over Time</CardTitle>
            <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
              Live
            </Badge>
          </div>
          <Link href="/dashboard/insights">
            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Waiting for live data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border pt-2 pb-4">
      <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium">Occupancy Over Time</CardTitle>
          {isLive && (
            <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
              Live
            </Badge>
          )}
        </div>
        <Link href="/dashboard/insights">
          <Button variant="ghost" size="sm" className="text-xs">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <TimeSeriesChart
          series={series}
          height={350}
          studyDurationMs={studyDurationMs}
          xAxisLabel="Timestamp"
          yAxisLabel={series.length === 1 ? series[0].title : undefined}
          seriesDescriptions={metricDescriptions}
          isLive={isLive}
        />
      </CardContent>
    </Card>
  )
}
