import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { RecentInsights } from "@/components/dashboard/recent-insights"
import { ActiveStudies } from "@/components/dashboard/active-studies"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { ZoneOverview } from "@/components/dashboard/zone-overview"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"

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
  const supabase = await createClient()

  const { data: space } = await supabase.from("spaces").select("*").limit(1).single()

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: metrics } = await supabase.from("metrics").select("*").eq("is_active", true)

  // Active pipeline studies (for widgets + count)
  const { data: beStudies } = await supabase
    .from("BE_studies")
    .select("*")
    .in("current_stage", ACTIVE_STAGES)
    .order("created_at", { ascending: false })
    .limit(5)

  // Completed studies — for heatmap zone highlights
  const { data: completedStudies } = await supabase
    .from("BE_studies")
    .select("*")
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)

  const completedStudy = completedStudies?.[0] ?? null

  // BE insight outputs — for Recent Insights widget and completed study heatmap
  const { data: beInsights } = await supabase
    .from("BE_insight_outputs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  // Most recent final insight output for the Occupancy Over Time chart
  const latestOutput = beInsights?.find(o => o.output_mode === "final_insights") ?? beInsights?.[0] ?? null

  // Most recent insight for the completed study (for heatmap dialog)
  let completedStudyInsights = null
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

  // Live preview metrics for monitoring_running studies
  const activeStudyIds = (beStudies || [])
    .filter(s => s.current_stage === "monitoring_running")
    .map(s => s.study_id)

  let livePreviewMetrics = null
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

  const insightsCount = (beInsights || []).reduce(
    (sum, o) => sum + (o.insights?.length ?? 0),
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
          zonesCount={zones?.length || 0}
          studiesCount={beStudies?.length || 0}
          insightsCount={insightsCount}
          metricsCount={metrics?.length || 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpaceHeatmap
            zones={zones || []}
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
          <ZoneOverview zones={zones || []} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActiveStudies studies={beStudies || []} />
          <RecentInsights outputs={beInsights || []} />
        </div>
      </div>
    </div>
  )
}
