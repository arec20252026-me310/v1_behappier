import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsList } from "@/components/insights/insights-list"
import { isDemoMode } from "@/lib/demo-mode"

export default async function InsightsPage() {
  const demo = await isDemoMode()
  const supabase = await createClient()

  const { data: outputs } = demo
    ? { data: [] }
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
