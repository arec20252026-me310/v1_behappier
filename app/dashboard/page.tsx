import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { RecentInsights } from "@/components/dashboard/recent-insights"
import { ActiveStudies } from "@/components/dashboard/active-studies"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { ZoneOverview } from "@/components/dashboard/zone-overview"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"
import { isDemoMode } from "@/lib/demo-mode"

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
  const demo = await isDemoMode()
  const supabase = await createClient()

  const space = demo ? null : (await supabase.from("spaces").select("*").limit(1).single()).data

  const zones = demo ? [] : ((await supabase
    .from("zones")
    .select("*")
    .order("created_at", { ascending: false })).data ?? [])

  const metrics = demo ? [] : ((await supabase
    .from("metrics")
    .select("*")
    .eq("is_active", true)).data ?? [])

  const beStudies = demo ? [] : ((await supabase
    .from("BE_studies")
    .select("*")
    .in("current_stage", ACTIVE_STAGES)
    .order("created_at", { ascending: false })
    .limit(5)).data ?? [])

  const beInsights = demo ? [] : ((await supabase
    .from("BE_insight_outputs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)).data ?? [])

  const latestOutput = beInsights.find(o => o.output_mode === "final_insights") ?? beInsights[0] ?? null

  let completedStudy = null
  let completedStudyInsights = null
  if (!demo) {
    const { data: completedStudies } = await supabase
      .from("BE_studies")
      .select("*")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
    completedStudy = completedStudies?.[0] ?? null

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
  }

  let livePreviewMetrics = null
  if (!demo) {
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
  }

  // Count each key finding, recommendation, chart, and table as one insight.
  // Use toArray so a raw string from n8n counts as 1, not as its character length.
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
          <ActiveStudies studies={beStudies} />
          <RecentInsights outputs={beInsights} />
        </div>
      </div>
    </div>
  )
}
