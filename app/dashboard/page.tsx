import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"
import { LatestDetectionCard } from "@/components/dashboard/latest-detection-card"
import { StudyStatusWatcher } from "@/components/dashboard/study-status-watcher"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { getDefaultSpace } from "@/lib/spaces"
import {
  DEMO_SPACE, ZONES, DEMO_METRICS,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE,
  BE_LIVE_METRICS, BE_INSIGHT_OUTPUT, DEMO_DETECTIONS, DEMO_CAMERA_PLACEMENTS,
  DEMO_LGQ_SPACE, ZONES_LGQ, DEMO_CAMERA_PLACEMENTS_LGQ, LGQ_SPACE_ID,
  DEMO_METRICS_LGQ, BE_STUDY_IN_PROGRESS_LGQ, BE_STUDY_COMPLETE_LGQ, BE_LIVE_METRICS_LGQ, DEMO_DETECTIONS_LGQ,
} from "@/lib/demo-seeds"

const ACTIVE_STATUSES = ["running", "analyzing"]

export default async function DashboardPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  // ── Demo mode: serve hardcoded data per scenario ──────────────────────────
  if (demo) {
    const demoSpaceId = await getDemoSpaceId()
    const isLGQ = demoSpaceId === LGQ_SPACE_ID

    const hasSpace    = scenario !== "blank"
    const hasStudy    = scenario === "study-in-progress" || scenario === "study-complete" || scenario === "model-created"
    const hasLive     = scenario === "study-in-progress"
    const hasInsights = !isLGQ && (scenario === "study-complete" || scenario === "model-created")
    const showInsightsBadge = !isLGQ && scenario === "study-complete"

    const demoSpace   = hasSpace ? (isLGQ ? DEMO_LGQ_SPACE : DEMO_SPACE) : null
    const demoZones   = hasSpace ? (isLGQ ? ZONES_LGQ : ZONES) : []
    const demoStudies = scenario === "study-in-progress"
      ? [isLGQ ? BE_STUDY_IN_PROGRESS_LGQ : BE_STUDY_IN_PROGRESS]
      : (scenario === "study-complete" || scenario === "model-created")
        ? [isLGQ ? BE_STUDY_COMPLETE_LGQ : BE_STUDY_COMPLETE]
        : []
    const demoInsights  = hasInsights ? [BE_INSIGHT_OUTPUT] : []
    const demoLive      = hasLive ? (isLGQ ? BE_LIVE_METRICS_LGQ : BE_LIVE_METRICS) : null
    const demoCompletedStudy    = hasStudy && scenario !== "study-in-progress" ? (isLGQ ? BE_STUDY_COMPLETE_LGQ : BE_STUDY_COMPLETE) : null
    // LGQ shows study data (zone highlight + detection feed) in all hasStudy scenarios
    const lgqDisplayStudy = isLGQ && hasStudy
      ? (scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS_LGQ : BE_STUDY_COMPLETE_LGQ)
      : null
    const demoCompletedInsights = showInsightsBadge ? BE_INSIGHT_OUTPUT : null
    const latestOutput = showInsightsBadge ? (demoInsights[0] ?? null) : null

    // For LGQ, fetch real metric count from Supabase (behaviors tab does the same)
    let lgqActiveMetricsCount = 0
    if (isLGQ && hasSpace) {
      const { data: lgqMetrics } = await supabase
        .from("metrics")
        .select("id")
        .eq("space_id", LGQ_SPACE_ID)
        .eq("is_active", true)
      lgqActiveMetricsCount = lgqMetrics?.length ?? 0
    }

    function toArr(v: unknown): unknown[] {
      if (Array.isArray(v)) return v
      if (v === null || v === undefined || v === "") return []
      return [v]
    }
    const insightsCount = showInsightsBadge ? demoInsights.reduce(
      (sum, o) =>
        sum +
        toArr(o.insights).length +
        toArr(o.recommendations).length +
        toArr(o.charts).length +
        toArr(o.tables).length,
      0
    ) : 0

    function withCitation(description: string, ref: string | null): string {
      if (!ref) return description
      const cited = ref.replace(/^(.*?\(\d{4}\)\.) (.+)$/, '$1 "$2"')
      return `${description} — ${cited}`
    }
    const demoMetricDescriptions: Record<string, string> = Object.fromEntries(
      DEMO_METRICS.map(m => [m.name, withCitation(m.description, m.literature_reference)])
    )

    return (
      <div className="flex flex-col h-full">
        <DashboardHeader
          title="Dashboard"
          subtitle={demoSpace?.name || "Get started by setting up your space"}
        />
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <MetricCards
            zonesCount={demoZones.length}
            studiesCount={demoStudies.length}
            insightsCount={insightsCount}
            metricsCount={hasStudy ? (isLGQ ? lgqActiveMetricsCount : DEMO_METRICS.filter(m => m.is_active).length) : 0}
            latestInsightAt={showInsightsBadge ? demoInsights[0]?.created_at : undefined}
            isDemo={true}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SpaceHeatmap
              zones={demoZones}
              insights={[]}
              space={demoSpace}
              studies={[]}
              cameras={hasSpace ? (isLGQ ? DEMO_CAMERA_PLACEMENTS_LGQ : DEMO_CAMERA_PLACEMENTS) : []}
              livePreviewMetrics={scenario === "study-in-progress" ? null : demoLive}
              completedStudy={demoCompletedStudy}
              completedStudyInsights={demoCompletedInsights}
              activeStudyId={lgqDisplayStudy?.study_id ?? (scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.study_id : undefined)}
              activeStudyStatus={lgqDisplayStudy?.status ?? (scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.status : undefined)}
              activeStudyMonitoredZoneId={lgqDisplayStudy?.metadata?.monitored_zone_id ?? (scenario === "study-in-progress" ? (BE_STUDY_IN_PROGRESS as { metadata?: { monitored_zone_id?: string } }).metadata?.monitored_zone_id : undefined)}
              demoDetections={lgqDisplayStudy ? DEMO_DETECTIONS_LGQ : (scenario === "study-in-progress" ? DEMO_DETECTIONS : undefined)}
              tracksOccupancy={scenario === "study-in-progress" || (isLGQ && hasStudy)}
              isDemo={true}
            />
            <div className="flex flex-col gap-6">
              <OccupancyChart
                latestOutput={latestOutput}
                studyDurationMs={(isLGQ ? BE_STUDY_COMPLETE_LGQ : BE_STUDY_COMPLETE).duration_seconds * 1000}
                metricDescriptions={demoMetricDescriptions}
                activeStudyId={lgqDisplayStudy?.study_id ?? (scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.study_id : undefined)}
                activeStudyStatus={lgqDisplayStudy?.status ?? (scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.status : undefined)}
                demoDetections={lgqDisplayStudy ? DEMO_DETECTIONS_LGQ : (scenario === "study-in-progress" ? DEMO_DETECTIONS : undefined)}
              />
              {(scenario === "study-in-progress" || lgqDisplayStudy) && (
                <LatestDetectionCard
                  studyId={lgqDisplayStudy?.study_id ?? BE_STUDY_IN_PROGRESS.study_id}
                  status={lgqDisplayStudy?.status ?? BE_STUDY_IN_PROGRESS.status}
                  demoDetections={(lgqDisplayStudy ? DEMO_DETECTIONS_LGQ : DEMO_DETECTIONS).slice(-1)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Real data ─────────────────────────────────────────────────────────────
  const space = await getDefaultSpace()

  const zones = space ? ((await supabase
    .from("zones")
    .select("*")
    .eq("space_id", space.id)
    .order("created_at", { ascending: false })).data ?? []) : []

  const zoneIds = zones.map((z: { id: string }) => z.id)
  const rawCameras = (zoneIds.length > 0 ? ((await supabase
    .from("cameras")
    .select("*")
    .in("zone_id", zoneIds)).data ?? []) : []) as {
    id: string; zone_id: string; name: string; metadata: Record<string, unknown> | null
  }[]
  const cameraGridRes = space?.grid_resolution || 8
  const cameraCellSize = Math.max(30, Math.min(60, 480 / cameraGridRes))
  const cameraPlacementsFromDB = rawCameras.map(cam => {
    const zone = zones.find((z: { id: string; grid_x: number; grid_y: number; grid_width: number; grid_height: number }) => z.id === cam.zone_id)
    const meta = cam.metadata ?? {}
    return {
      id: `cam-${cam.zone_id}`,
      zoneId: cam.zone_id,
      x: typeof meta.placement_x === "number" ? meta.placement_x : zone ? (zone.grid_x + zone.grid_width / 2) * cameraCellSize : 0,
      y: typeof meta.placement_y === "number" ? meta.placement_y : zone ? (zone.grid_y + zone.grid_height / 2) * cameraCellSize : 0,
      fracX: typeof meta.placement_frac_x === "number" ? meta.placement_frac_x : undefined,
      fracY: typeof meta.placement_frac_y === "number" ? meta.placement_frac_y : undefined,
      direction: (typeof meta.placement_direction === "string" ? meta.placement_direction : "down") as import("@/lib/types").CameraDirection,
      label: cam.name,
    }
  })

  const metrics = space ? ((await supabase
    .from("metrics")
    .select("*")
    .eq("space_id", space.id)
    .eq("is_active", true)).data ?? []) : []

  const beStudies = space ? ((await supabase
    .from("BE_studies")
    .select("*")
    .eq("building_id", space.id)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(5)).data ?? []) : []

  // Gather all study IDs for this space to filter insights
  const allSpaceStudyIds: string[] = beStudies.map((s: { study_id: string }) => s.study_id)

  const beInsights = allSpaceStudyIds.length > 0 ? ((await supabase
    .from("BE_insight_outputs")
    .select("*")
    .in("study_id", allSpaceStudyIds)
    .order("created_at", { ascending: false })
    .limit(5)).data ?? []) : []

  const allFetchedStudies = [...beStudies]

  let completedStudies: typeof beStudies = []
  let completedStudy = null
  let completedStudyInsights = null
  const { data: completed } = space ? await supabase
    .from("BE_studies")
    .select("*")
    .eq("building_id", space.id)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(4) : { data: [] }
  completedStudies = completed ?? []
  completedStudy = completedStudies[0] ?? null
  allFetchedStudies.push(...completedStudies)
  allSpaceStudyIds.push(...completedStudies.map((s: { study_id: string }) => s.study_id))

  if (completedStudy) {
    const { data: studyInsight } = await supabase
      .from("BE_insight_outputs")
      .select("*")
      .eq("study_id", completedStudy.study_id)
      .eq("output_mode", "final_insights")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    completedStudyInsights = studyInsight ?? null
  }

  // latestOutput: prefer active-study insights, fall back to most recent completed study
  const latestOutput = beInsights.find(o => o.output_mode === "final_insights")
    ?? beInsights[0]
    ?? completedStudyInsights
    ?? null

  let livePreviewMetrics = null
  const activeStudyIds = beStudies
    .filter(s => s.current_stage === "monitoring_running")
    .map(s => s.study_id)

  if (activeStudyIds.length > 0) {
    const { data: preview } = await supabase
      .from("BE_live_preview_metrics")
      .select("*")
      .in("study_id", activeStudyIds)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()
    livePreviewMetrics = preview ?? null
  }

  function toArr(v: unknown): unknown[] {
    if (Array.isArray(v)) return v
    if (v === null || v === undefined || v === "") return []
    return [v]
  }
  const insightsCount = beInsights.reduce(
    (sum, o) =>
      sum +
      toArr(o.insights).length +
      toArr(o.recommendations).length +
      toArr(o.charts).length +
      toArr(o.tables).length,
    0
  )

  function withCitation(description: string, ref: string | null): string {
    if (!ref) return description
    const cited = ref.replace(/^(.*?\(\d{4}\)\.) (.+)$/, '$1 "$2"')
    return `${description} — ${cited}`
  }
  const metricDescriptions: Record<string, string> = Object.fromEntries(
    (metrics as { name: string; description: string; literature_reference: string | null }[])
      .map(m => [m.name, withCitation(m.description, m.literature_reference)])
  )

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Dashboard"
        subtitle={space?.name || "Get started by setting up your space"}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <MetricCards
          zonesCount={zones.length}
          studiesCount={beStudies.length}
          insightsCount={insightsCount}
          metricsCount={metrics.length}
          latestInsightAt={beInsights[0]?.created_at}
        />

        {beStudies.map(s => <StudyStatusWatcher key={s.study_id} activeStudyId={s.study_id} />)}

        {(() => {
          // Include both "running" and "analyzing" so zones stay lit during analysis
          const activeStudies = beStudies.map(s => {
            const meta = (s as { metadata?: { monitored_zone_id?: string; target_zones?: string[] } }).metadata
            return {
              study_id: s.study_id,
              status: s.status,
              monitoredZoneId: meta?.monitored_zone_id ?? meta?.target_zones?.[0] ?? null,
            }
          })

          const completedZoneInsights = completedStudies.flatMap(study => {
            const meta = (study as { metadata?: { monitored_zone_id?: string; target_zones?: string[] } }).metadata
            const zoneId = meta?.monitored_zone_id ?? meta?.target_zones?.[0] ?? null
            if (!zoneId) return []
            const insight = beInsights.find(o => o.study_id === study.study_id && o.output_mode === "final_insights")
            if (!insight) return []
            return [{ zoneId, studyId: study.study_id, insights: insight }]
          })

          const chartStudies = activeStudies.map(s => ({ study_id: s.study_id, status: s.status }))
          const detectionCardStudies = activeStudies.map(s => ({ studyId: s.study_id, status: s.status }))

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpaceHeatmap
                zones={zones}
                insights={[]}
                space={space}
                studies={[]}
                cameras={cameraPlacementsFromDB}
                livePreviewMetrics={livePreviewMetrics}
                activeStudies={activeStudies}
                completedZoneInsights={completedZoneInsights}
                tracksOccupancy={metrics.some(m => (m as { name: string }).name?.toLowerCase().includes("occupancy"))}
              />
              <div className="flex flex-col gap-6">
                <OccupancyChart
                  latestOutput={latestOutput}
                  metricDescriptions={metricDescriptions}
                  studyDurationMs={(() => {
                    const s = allFetchedStudies.find(s => s.study_id === latestOutput?.study_id)
                    return s?.duration_seconds ? s.duration_seconds * 1000 : undefined
                  })()}
                  activeStudies={chartStudies.length > 0 ? chartStudies : undefined}
                />
                {detectionCardStudies.length > 0 && (
                  <LatestDetectionCard studies={detectionCardStudies} />
                )}
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
