import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsList } from "@/components/insights/insights-list"
import { getDemoScenario } from "@/lib/demo-mode"
import { BE_INSIGHT_OUTPUT } from "@/lib/demo-seeds"

export default async function InsightsPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  const { data: outputs } = demo
    ? { data: scenario === "study-complete" ? [BE_INSIGHT_OUTPUT] : [] }
    : await supabase
        .from("BE_insight_outputs")
        .select("*")
        .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Insights"
        subtitle="AI-generated findings and recommendations from your studies"
      />

      <div className="flex-1 p-6 overflow-auto">
        <InsightsList outputs={outputs || []} />
      </div>
    </div>
  )
}
