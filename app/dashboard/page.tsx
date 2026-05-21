import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"
import { LatestDetectionCard } from "@/components/dashboard/latest-detection-card"
import { StudyStatusWatcher } from "@/components/dashboard/study-status-watcher"
import { getDemoScenario } from "@/lib/demo-mode"
import {
  DEMO_SPACE, ZONES, DEMO_METRICS,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE,
  BE_LIVE_METRICS, BE_INSIGHT_OUTPUT, DEMO_DETECTIONS,
} from "@/lib/demo-seeds"

const ACTIVE_STATUSES = ["running", "analyzing"]

export default async function DashboardPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  // ── Demo mode: serve hardcoded data per scenario ──────────────────────────
  if (demo) {
    const hasSpace  = scenario !== "blank"
    const hasStudy  = scenario === "study-in-progress" || scenario === "study-complete"
    const hasLive   = scenario === "study-in-progress"
    const hasInsights = scenario === "study-complete"

    const demoSpace   = hasSpace ? DEMO_SPACE : null
    const demoZones   = hasSpace ? ZONES : []
    const demoStudies = hasStudy ? (scenario === "study-in-progress" ? [BE_STUDY_IN_PROGRESS] : []) : []
    const demoCompleted = hasInsights ? [BE_STUDY_COMPLETE] : []
    const demoInsights  = hasInsights ? [BE_INSIGHT_OUTPUT] : []
    const demoLive      = hasLive ? BE_LIVE_METRICS : null
    const demoCompletedStudy    = hasInsights ? BE_STUDY_COMPLETE : null
    const demoCompletedInsights = hasInsights ? BE_INSIGHT_OUTPUT : null
    const latestOutput = demoInsights[0] ?? null

    function toArr(v: unknown): unknown[] {
      if (Array.isArray(v)) return v
      if (v === null || v === undefined || v === "") return []
      return [v]
    }
    const insightsCount = demoInsights.reduce(
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
            metricsCount={hasStudy ? DEMO_METRICS.filter(m => m.is_active).length : 0}
            latestInsightAt={demoInsights[0]?.created_at}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SpaceHeatmap
              zones={demoZones}
              insights={[]}
              space={demoSpace}
              studies={[]}
              livePreviewMetrics={demoLive}
              completedStudy={demoCompletedStudy}
              completedStudyInsights={demoCompletedInsights}
              activeStudyId={scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.study_id : undefined}
              activeStudyStatus={scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.status : undefined}
              activeStudyMonitoredZoneId={scenario === "study-in-progress" ? (BE_STUDY_IN_PROGRESS as { metadata?: { monitored_zone_id?: string } }).metadata?.monitored_zone_id : undefined}
              demoDetections={scenario === "study-in-progress" ? DEMO_DETECTIONS : undefined}
            tracksOccupancy={scenario === "study-in-progress"}
            />
            <div className="flex flex-col gap-6">
              <OccupancyChart
                latestOutput={latestOutput}
                studyDurationMs={BE_STUDY_COMPLETE.duration_seconds * 1000}
                metricDescriptions={demoMetricDescriptions}
                activeStudyId={scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.study_id : undefined}
                activeStudyStatus={scenario === "study-in-progress" ? BE_STUDY_IN_PROGRESS.status : undefined}
                demoDetections={scenario === "study-in-progress" ? DEMO_DETECTIONS : undefined}
              />
              {scenario === "study-in-progress" && (
                <LatestDetectionCard
                  studyId={BE_STUDY_IN_PROGRESS.study_id}
                  status={BE_STUDY_IN_PROGRESS.status}
                  demoDetections={DEMO_DETECTIONS}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Real data ─────────────────────────────────────────────────────────────
  const space = (await supabase.from("spaces").select("*").limit(1).single()).data

  const zones = ((await supabase
    .from("zones")
    .select("*")
    .order("created_at", { ascending: false })).data ?? [])

  const metrics = ((await supabase
    .from("metrics")
    .select("*")
    .eq("is_active", true)).data ?? [])

  const beStudies = ((await supabase
    .from("BE_studies")
    .select("*")
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(5)).data ?? [])

  const beInsights = ((await supabase
    .from("BE_insight_outputs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)).data ?? [])

  const latestOutput = beInsights.find(o => o.output_mode === "final_insights") ?? beInsights[0] ?? null
  const allFetchedStudies = [...beStudies]

  let completedStudies: typeof beStudies = []
  let completedStudy = null
  let completedStudyInsights = null
  const { data: completed } = await supabase
    .from("BE_studies")
    .select("*")
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(4)
  completedStudies = completed ?? []
  completedStudy = completedStudies[0] ?? null
  allFetchedStudies.push(...completedStudies)

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
