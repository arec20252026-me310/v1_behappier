"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BarChart3, Maximize2 } from "lucide-react"
import Link from "next/link"
import type { BEInsightOutput } from "@/lib/types"
import { TimeSeriesChart } from "@/components/insights/time-series-chart"
import type { ChartSeries } from "@/components/insights/time-series-chart"
import { createClient } from "@/lib/supabase/client"
import { LiveDetectionFeed, type DetectionRow } from "@/components/studies/live-detection-feed"

interface ActiveStudyEntry {
  study_id: string
  status: string
}

interface OccupancyChartProps {
  latestOutput?: BEInsightOutput | null
  studyDurationMs?: number
  metricDescriptions?: Record<string, string>
  // Legacy single-study (demo mode)
  activeStudyId?: string
  activeStudyStatus?: string
  demoDetections?: DetectionRow[]
  // Multi-study (real mode)
  activeStudies?: ActiveStudyEntry[]
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
  activeStudyStatus,
  demoDetections,
  activeStudies: activeStudiesProp,
}: OccupancyChartProps) {
  const [perStudyDetections, setPerStudyDetections] = useState<Record<string, DetectionRow[]>>({})
  const [isEnlarged, setIsEnlarged] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  // Merge legacy single-study prop with multi-study prop
  const allActiveStudies: ActiveStudyEntry[] = useMemo(() => {
    if (activeStudiesProp && activeStudiesProp.length > 0) return activeStudiesProp
    if (activeStudyId) return [{ study_id: activeStudyId, status: activeStudyStatus ?? "running" }]
    return []
  }, [activeStudiesProp, activeStudyId, activeStudyStatus])

  const studiesKey = allActiveStudies.map(s => s.study_id).sort().join(",")
  const isLive = allActiveStudies.length > 0

  useEffect(() => {
    setPerStudyDetections({})
    if (!isLive) return

    if (demoDetections && allActiveStudies.length > 0) {
      setPerStudyDetections({ [allActiveStudies[0].study_id]: demoDetections })
      return
    }

    const supabase = createClient()
    const studyIdSet = new Set(allActiveStudies.map(s => s.study_id))

    allActiveStudies.forEach(({ study_id }) => {
      supabase
        .from("BE_behavior_detections")
        .select("timestamp_pt, detected_behaviors, notes")
        .eq("study_id", study_id)
        .order("timestamp", { ascending: true })
        .limit(200)
        .then(({ data }) => {
          if (data) setPerStudyDetections(prev => ({ ...prev, [study_id]: data as DetectionRow[] }))
        })
    })

    const channel = supabase
      .channel("occupancy-chart-multi-" + studiesKey)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "BE_behavior_detections" },
        (payload) => {
          const studyId = (payload.new as { study_id?: string }).study_id
          if (!studyId || !studyIdSet.has(studyId)) return
          setPerStudyDetections(prev => ({
            ...prev,
            [studyId]: [...(prev[studyId] ?? []), payload.new as DetectionRow],
          }))
        })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studiesKey, demoDetections])

  const fallbackSeries = latestOutput ? extractLineSeries(latestOutput) : []
  const totalDetections = Object.values(perStudyDetections).reduce((sum, d) => sum + d.length, 0)

  // Empty non-live state
  if (!isLive && !fallbackSeries.length) {
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
            <p className="text-xs text-muted-foreground mb-4">Start a study to begin collecting data</p>
            <Link href="/dashboard/studies"><Button size="sm">Create Study</Button></Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Waiting for first live data
  if (isLive && totalDetections === 0) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Occupancy Over Time</CardTitle>
            <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
              {allActiveStudies.length > 1 ? `Live ×${allActiveStudies.length}` : "Live"}
            </Badge>
          </div>
          <Link href="/dashboard/insights"><Button variant="ghost" size="sm" className="text-xs">View All</Button></Link>
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

  const renderCharts = (enlarged: boolean) => {
    if (!isLive) {
      return (
        <TimeSeriesChart
          series={fallbackSeries}
          height={enlarged ? "calc(88vh - 110px)" : 350}
          studyDurationMs={studyDurationMs}
          xAxisLabel="Timestamp"
          yAxisLabel={fallbackSeries.length === 1 ? fallbackSeries[0].title : undefined}
          seriesDescriptions={metricDescriptions}
          isLive={false}
        />
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {allActiveStudies.map(({ study_id }, idx) => {
          const detections = perStudyDetections[study_id] ?? []
          const liveSeries = buildLiveSeries(detections)
          const chartHeight = enlarged
            ? `calc((88vh - 110px) / ${allActiveStudies.length})`
            : Math.max(140, Math.floor(220 / allActiveStudies.length))

          return (
            <div key={study_id}>
              {allActiveStudies.length > 1 && (
                <p className="text-[10px] font-mono text-muted-foreground/60 mb-1 truncate">
                  Study {idx + 1}: {study_id}
                </p>
              )}
              {detections.length === 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 py-2">
                  <BarChart3 className="h-3 w-3 animate-pulse" />
                  <span>Waiting for data…</span>
                </div>
              ) : (
                <TimeSeriesChart
                  series={liveSeries}
                  height={chartHeight}
                  xAxisLabel="Timestamp"
                  yAxisLabel={liveSeries.length === 1 ? liveSeries[0].title : undefined}
                  seriesDescriptions={metricDescriptions}
                  isLive={true}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Occupancy Over Time</CardTitle>
            {isLive && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
                {allActiveStudies.length > 1 ? `Live ×${allActiveStudies.length}` : "Live"}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setIsEnlarged(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            Enlarge
          </Button>
        </CardHeader>
        <CardContent>{renderCharts(false)}</CardContent>
      </Card>

      <Dialog open={isEnlarged} onOpenChange={(open) => !open && setIsEnlarged(false)}>
        <DialogContent className="sm:max-w-[92vw] w-[92vw] h-[88vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col h-full p-4">
            <DialogHeader className="shrink-0 pb-3">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-medium">Occupancy Over Time</DialogTitle>
                {isLive && (
                  <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
                    {allActiveStudies.length > 1 ? `Live ×${allActiveStudies.length}` : "Live"}
                  </Badge>
                )}
              </div>
              <DialogDescription className="sr-only">Enlarged occupancy chart</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 flex flex-row gap-6 overflow-hidden">
              {/* Left: chart(s) — 60% width when live, full width otherwise */}
              <div className={`${isLive && allActiveStudies.length > 0 ? "w-[60%] shrink-0" : "flex-1 min-w-0"} overflow-y-auto`}>
                {renderCharts(true)}
              </div>
              {/* Right: detections */}
              {isLive && allActiveStudies.length > 0 && (
                <div className="flex-1 min-w-0 border-l border-border pl-6 overflow-y-auto flex flex-col gap-4">
                  {allActiveStudies.map((s, idx) => (
                    <div key={s.study_id} className={idx > 0 ? "pt-4 border-t border-border" : ""}>
                      {allActiveStudies.length > 1 && (
                        <p className="text-[10px] font-mono text-muted-foreground/60 mb-1 truncate">
                          Study {idx + 1}: {s.study_id}
                        </p>
                      )}
                      <p className="text-base font-medium text-muted-foreground uppercase tracking-wide mb-3">Latest Detection</p>
                      <LiveDetectionFeed
                        studyId={s.study_id}
                        status={s.status}
                        limit={1}
                        demoDetections={idx === 0 ? demoDetections : undefined}
                        large
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
