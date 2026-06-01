"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

interface ActiveStudyEntry {
  study_id: string
  status: string
}

interface OccupancyChartProps {
  latestOutput?: BEInsightOutput | null
  completedOutputs?: BEInsightOutput[]
  studyDurationMs?: number
  metricDescriptions?: Record<string, string>
  studyNames?: Record<string, string>
  showAllCompleted?: boolean
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
  completedOutputs,
  studyDurationMs,
  metricDescriptions,
  studyNames,
  showAllCompleted = false,
  activeStudyId,
  activeStudyStatus,
  demoDetections,
  activeStudies: activeStudiesProp,
}: OccupancyChartProps) {
  const [perStudyDetections, setPerStudyDetections] = useState<Record<string, DetectionRow[]>>({})
  const [isEnlarged, setIsEnlarged] = useState(false)
  const [lastDetectionAt, setLastDetectionAt] = useState<number | null>(null)
  const [agoText, setAgoText] = useState<string | null>(null)
  const [visibleOutputs, setVisibleOutputs] = useState<BEInsightOutput[]>([])
  const [enlargedChartAreaHeight, setEnlargedChartAreaHeight] = useState(0)
  const enlargedChartAreaRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  // Determine which completed outputs to show based on localStorage viewed timestamp
  useEffect(() => {
    if (!completedOutputs || completedOutputs.length === 0) { setVisibleOutputs([]); return }
    if (showAllCompleted) { setVisibleOutputs(completedOutputs); return }
    const viewedAt = localStorage.getItem("behappier_insights_viewed_at")
    const unreviewed = viewedAt
      ? completedOutputs.filter(o => new Date(o.created_at) > new Date(viewedAt))
      : completedOutputs
    setVisibleOutputs(unreviewed.length > 0 ? unreviewed.slice(0, 3) : completedOutputs.slice(0, 1))
  }, [completedOutputs, showAllCompleted])

  // Merge legacy single-study prop with multi-study prop
  const allActiveStudies: ActiveStudyEntry[] = useMemo(() => {
    if (activeStudiesProp && activeStudiesProp.length > 0) return activeStudiesProp
    if (activeStudyId) return [{ study_id: activeStudyId, status: activeStudyStatus ?? "running" }]
    return []
  }, [activeStudiesProp, activeStudyId, activeStudyStatus])

  const studiesKey = allActiveStudies.map(s => s.study_id).sort().join(",")
  const isLive = allActiveStudies.length > 0

  // Update "X ago" label every second while live
  useEffect(() => {
    if (!isLive || lastDetectionAt === null) { setAgoText(null); return }
    const update = () => {
      const s = Math.floor((Date.now() - lastDetectionAt) / 1000)
      setAgoText(s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [isLive, lastDetectionAt])

  useEffect(() => {
    setPerStudyDetections({})
    if (!isLive) return

    if (demoDetections && allActiveStudies.length > 0) {
      setPerStudyDetections({ [allActiveStudies[0].study_id]: demoDetections })
      setLastDetectionAt(Date.now())
      return
    }

    const supabase = createClient()
    const studyIdSet = new Set(allActiveStudies.map(s => s.study_id))

    allActiveStudies.forEach(({ study_id }) => {
      supabase
        .from("BE_behavior_detections")
        .select("timestamp_pt, detected_behaviors, notes, timestamp")
        .eq("study_id", study_id)
        .order("timestamp", { ascending: true })
        .limit(200)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setPerStudyDetections(prev => ({ ...prev, [study_id]: data as DetectionRow[] }))
            const lastTs = (data as (DetectionRow & { timestamp: string })[]).at(-1)?.timestamp
            if (lastTs) {
              const t = new Date(lastTs).getTime()
              if (isFinite(t)) setLastDetectionAt(prev => prev === null || t > prev ? t : prev)
            }
          }
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
          setLastDetectionAt(Date.now())
        })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studiesKey, demoDetections])

  // Measure the enlarged chart column so charts get an explicit pixel height
  useEffect(() => {
    if (!isEnlarged) return
    const el = enlargedChartAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setEnlargedChartAreaHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isEnlarged])

  // visibleOutputs drives the chart when not live; fall back to latestOutput for demo mode
  const completedSeries = visibleOutputs.length > 0
    ? visibleOutputs.map(o => ({ output: o, series: extractLineSeries(o) }))
    : latestOutput ? [{ output: latestOutput, series: extractLineSeries(latestOutput) }] : []
  const totalDetections = Object.values(perStudyDetections).reduce((sum, d) => sum + d.length, 0)

  // Empty non-live state
  if (!isLive && completedSeries.length === 0) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pt-1.5 pb-1.5">
          <CardTitle className="text-xl font-medium">Most Recent Study</CardTitle>
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
        <CardHeader className="pt-1.5 pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-medium">{allActiveStudies.length > 1 ? "Current Studies" : "Current Study"}</CardTitle>
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
    // Per-chart height for live multi-study (3+ studies) enlarged view only.
    // 130px = series checkboxes + preset buttons + scrubber + live indicator.
    // 26px = study label row. Non-live completed path uses its own formula below.
    const multiStudyCount = allActiveStudies.length
    const perStudyChartHeight = enlarged && isLive && multiStudyCount > 1
      ? Math.max(150, Math.floor(enlargedChartAreaHeight / multiStudyCount) - 130 - 26)
      : 0

    if (!isLive) {
      const n = completedSeries.length
      if (n === 0) return null
      if (n === 1) {
        const { series } = completedSeries[0]
        if (enlarged) return (
          <div className="h-full flex flex-col">
            <TimeSeriesChart
              series={series}
              fillHeight
              studyDurationMs={studyDurationMs}
              xAxisLabel="Timestamp"
              yAxisLabel={series.length === 1 ? series[0].title : undefined}
              seriesDescriptions={metricDescriptions}
              isLive={false}
              enlarged
            />
          </div>
        )
        return (
          <TimeSeriesChart
            series={series}
            height={350}
            studyDurationMs={studyDurationMs}
            xAxisLabel="Timestamp"
            yAxisLabel={series.length === 1 ? series[0].title : undefined}
            seriesDescriptions={metricDescriptions}
            isLive={false}
            enlarged={false}
          />
        )
      }
      // Multiple completed studies — enlarged uses CSS flex so charts fill the space
      // without needing a ResizeObserver measurement that may be stale.
      if (enlarged) {
        return (
          <div className="h-full flex flex-col">
            {completedSeries.map(({ output, series }, idx) => (
              <div
                key={output.study_id}
                className={cn("flex-1 min-h-0 overflow-hidden flex flex-col", idx > 0 && "border-t border-border/50 pt-1")}
              >
                <p className="mb-0.5 shrink-0 truncate text-muted-foreground/60 text-sm">
                  Study {idx + 1}: {studyNames?.[output.study_id] ?? output.study_id}
                </p>
                <div className="flex-1 min-h-0 flex flex-col">
                  <TimeSeriesChart
                    series={series}
                    fillHeight
                    xAxisLabel="Timestamp"
                    yAxisLabel={series.length === 1 ? series[0].title : undefined}
                    seriesDescriptions={metricDescriptions}
                    isLive={false}
                    compact={n > 1}
                    enlarged
                  />
                </div>
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="flex flex-col overflow-y-auto">
          {completedSeries.map(({ output, series }, idx) => (
            <div
              key={output.study_id}
              className={cn(idx > 0 ? "border-t border-border/50 pt-1 mt-1" : "")}
            >
              <p className="mb-0.5 truncate text-muted-foreground/60 text-xs">
                Study {idx + 1}: {studyNames?.[output.study_id] ?? output.study_id}
              </p>
              <TimeSeriesChart
                series={series}
                height={n === 2 ? 200 : 160}
                xAxisLabel="Timestamp"
                yAxisLabel={series.length === 1 ? series[0].title : undefined}
                seriesDescriptions={metricDescriptions}
                isLive={false}
                compact={n > 1}
                enlarged={false}
              />
            </div>
          ))}
        </div>
      )
    }

    const n = allActiveStudies.length
    return (
      <div className="flex flex-col overflow-y-auto">
        {allActiveStudies.map(({ study_id }, idx) => {
          const detections = perStudyDetections[study_id] ?? []
          const liveSeries = buildLiveSeries(detections)
          const isCompact = !enlarged && n > 1

          return (
            <div
              key={study_id}
              className={cn(idx > 0 && n > 1 ? "border-t border-border/50 pt-1 mt-1" : "")}
            >
              {n > 1 && (
                <p className={cn("mb-0.5 truncate text-muted-foreground/60", enlarged ? "text-sm" : "text-xs")}>
                  Study {idx + 1}: {studyNames?.[study_id] ?? study_id}
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
                  height={enlarged ? perStudyChartHeight : (n === 1 ? 200 : n === 2 ? 180 : 150)}
                  xAxisLabel="Timestamp"
                  yAxisLabel={liveSeries.length === 1 ? liveSeries[0].title : undefined}
                  seriesDescriptions={metricDescriptions}
                  isLive={true}
                  compact={isCompact}
                  enlarged={enlarged}
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
        <CardHeader className="pt-1.5 pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-xl font-medium">{isLive ? (allActiveStudies.length > 1 ? "Current Studies" : "Current Study") : completedSeries.length > 1 ? "Recent Studies" : "Most Recent Study"}</CardTitle>
            {isLive && agoText && (
              <span className="text-xs text-muted-foreground font-normal">Last detection {agoText}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setIsEnlarged(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            Enlarge
          </Button>
        </CardHeader>
        <CardContent className={isLive && allActiveStudies.length >= 3 ? "px-6 py-0 pb-1" : ""}>{renderCharts(false)}</CardContent>
      </Card>

      <Dialog open={isEnlarged} onOpenChange={(open) => !open && setIsEnlarged(false)}>
        <DialogContent className="sm:max-w-[92vw] w-[92vw] h-[88vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col h-full p-4">
            <DialogHeader className="shrink-0 pb-3">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-5xl font-medium">{isLive ? (allActiveStudies.length > 1 ? "Current Studies" : "Current Study") : completedSeries.length > 1 ? "Recent Studies" : "Most Recent Study"}</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Enlarged occupancy chart</DialogDescription>
            </DialogHeader>

            {/* 2×2 layout: one row per study, chart left / detection right.
                Row heights are pinned to explicit pixels from ResizeObserver so content
                (especially long detection text) cannot push the row taller. */}
            {isLive && allActiveStudies.length === 2 ? (() => {
              const rowHeight = enlargedChartAreaHeight > 0 ? Math.floor(enlargedChartAreaHeight / 2) : 0
              const perStudyChartHeight = rowHeight > 0 ? Math.max(120, rowHeight - 160) : 200
              return (
                <div ref={enlargedChartAreaRef} className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {allActiveStudies.map((s, idx) => {
                    const detections = perStudyDetections[s.study_id] ?? []
                    const liveSeries = buildLiveSeries(detections)
                    return (
                      <div
                        key={s.study_id}
                        style={rowHeight > 0
                          ? { height: rowHeight, maxHeight: rowHeight, overflow: "hidden", flexShrink: 0 }
                          : { flex: "1 1 0", minHeight: 0, overflow: "hidden" }}
                        className={cn("grid grid-cols-[60%_1fr]", idx > 0 && "border-t border-border")}
                      >
                        {/* Chart cell */}
                        <div className="min-h-0 overflow-hidden pr-6 pt-1">
                          <p className="text-sm text-muted-foreground/60 mb-0.5 truncate">
                            Study {idx + 1}: {studyNames?.[s.study_id] ?? s.study_id}
                          </p>
                          {detections.length === 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 py-2">
                              <BarChart3 className="h-3 w-3 animate-pulse" />
                              <span>Waiting for data…</span>
                            </div>
                          ) : (
                            <TimeSeriesChart
                              series={liveSeries}
                              height={perStudyChartHeight}
                              xAxisLabel="Timestamp"
                              yAxisLabel={liveSeries.length === 1 ? liveSeries[0].title : undefined}
                              seriesDescriptions={metricDescriptions}
                              isLive={true}
                              compact={false}
                              enlarged
                            />
                          )}
                        </div>
                        {/* Detection cell */}
                        <div className="border-l border-border pl-6 flex flex-col overflow-hidden pt-1">
                          <p className="text-xs text-muted-foreground/60 mb-0.5 truncate shrink-0">
                            Study {idx + 1}: {studyNames?.[s.study_id] ?? s.study_id}
                          </p>
                          <p className="text-xl font-medium text-muted-foreground uppercase tracking-wide mb-2 shrink-0">
                            Latest Detection
                          </p>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            <LiveDetectionFeed
                              studyId={s.study_id}
                              status={s.status}
                              limit={1}
                              demoDetections={idx === 0 ? demoDetections : undefined}
                              large
                              studyCount={allActiveStudies.length}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })() : (
              /* Single study or non-live: original left/right layout */
              <div className="flex-1 min-h-0 flex flex-row gap-6 overflow-hidden">
                <div ref={enlargedChartAreaRef} className={`${isLive && allActiveStudies.length > 0 ? "w-[60%] shrink-0" : "flex-1 min-w-0"} overflow-hidden h-full`}>
                  {renderCharts(true)}
                </div>
                {isLive && allActiveStudies.length > 0 && (
                  <div className="flex-1 min-w-0 border-l border-border pl-6 overflow-hidden flex flex-col">
                    {allActiveStudies.map((s, idx) => (
                      <div key={s.study_id} className={cn("flex-1 min-h-0 flex flex-col overflow-hidden", idx > 0 && "border-t border-border pt-3")}>
                        {allActiveStudies.length > 1 && (
                          <p className="text-xs text-muted-foreground/60 mb-0.5 truncate shrink-0">
                            Study {idx + 1}: {studyNames?.[s.study_id] ?? s.study_id}
                          </p>
                        )}
                        <p className="text-xl font-medium text-muted-foreground uppercase tracking-wide mb-2 shrink-0">Latest Detection</p>
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <LiveDetectionFeed
                            studyId={s.study_id}
                            status={s.status}
                            limit={1}
                            demoDetections={idx === 0 ? demoDetections : undefined}
                            large
                            studyCount={allActiveStudies.length}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
