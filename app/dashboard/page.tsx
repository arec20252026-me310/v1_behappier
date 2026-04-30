import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { RecentInsights } from "@/components/dashboard/recent-insights"
import { ActiveStudies } from "@/components/dashboard/active-studies"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { ZoneOverview } from "@/components/dashboard/zone-overview"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"

// BE stages considered "running" for the metric card count
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

  // Space & zones (frontend tables — used for layout/heatmap display)
  const { data: space } = await supabase
    .from("spaces")
    .select("*")
    .limit(1)
    .single()

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .order("created_at", { ascending: false })

  // Metrics (frontend table)
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("is_active", true)

  // BE_studies — active pipeline studies for the dashboard widget and count
  const { data: beStudies } = await supabase
    .from("BE_studies")
    .select("*")
    .in("current_stage", ACTIVE_STAGES)
    .order("created_at", { ascending: false })
    .limit(5)

  // BE_insight_outputs — for Recent Insights widget and count
  const { data: beInsights } = await supabase
    .from("BE_insight_outputs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  // BE_live_preview_metrics — most recent preview for any active study
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

  // Insight count: total distinct insight strings across all outputs
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
          />
          <OccupancyChart />
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
