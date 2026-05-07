import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { RecentInsights } from "@/components/dashboard/recent-insights"
import { ActiveStudies } from "@/components/dashboard/active-studies"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { ZoneOverview } from "@/components/dashboard/zone-overview"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"
import { getDemoScenario } from "@/lib/demo-mode"
import {
  DEMO_SPACE, ZONES, DEMO_METRICS,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE,
  BE_LIVE_METRICS, BE_INSIGHT_OUTPUT,
} from "@/lib/demo-seeds"

const ACTIVE_STAGES = [
  "planned",
  "needfinding_running",
  "needfinding_complete",
  "monitoring_running",
  "monitoring_paused",
  "milestone_review",
  "monitoring_complete",
  "insights_running",
]

export default async function DashboardPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  // ── Demo mode: serve hardcoded data per scenario ──────────────────────────
  if (demo) {
    const hasSpace  = scenario !== "blank"
    const hasStudy  = scenario === "study-in-progress" || scenario === "study-complete"
    const hasLive   = false
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
            />
            <OccupancyChart latestOutput={latestOutput} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ZoneOverview zones={demoZones} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActiveStudies studies={[...demoStudies, ...demoCompleted]} />
            <RecentInsights outputs={demoInsights} />
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
    .in("current_stage", ACTIVE_STAGES)
    .order("created_at", { ascending: false })
    .limit(5)).data ?? [])

  const beInsights = ((await supabase
    .from("BE_insight_outputs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)).data ?? [])

  const latestOutput = beInsights.find(o => o.output_mode === "final_insights") ?? beInsights[0] ?? null

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
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpaceHeatmap
            zones={zones}
            insights={[]}
            space={space}
            studies={[]}
            livePreviewMetrics={livePreviewMetrics}
            completedStudy={completedStudy}
            completedStudyInsights={completedStudyInsights}
          />
          <OccupancyChart latestOutput={latestOutput} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ZoneOverview zones={zones} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActiveStudies studies={[...beStudies, ...completedStudies]} />
          <RecentInsights outputs={beInsights} />
        </div>
      </div>
    </div>
  )
}
