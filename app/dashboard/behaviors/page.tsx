import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricsManager } from "@/components/metrics/metrics-manager"
import { getDemoScenario } from "@/lib/demo-mode"
import { getDefaultSpace } from "@/lib/spaces"
import { DEMO_SPACE, DEMO_METRICS } from "@/lib/demo-seeds"
import type { Metric } from "@/lib/types"

export default async function MetricsPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  const hasSpace  = demo && scenario !== "blank"
  const hasStudy  = demo && (scenario === "study-in-progress" || scenario === "study-complete" || scenario === "model-created")
  const space = demo
    ? (hasSpace ? DEMO_SPACE : null)
    : await getDefaultSpace()

  let metrics: Metric[] = []
  if (demo) {
    metrics = hasStudy ? (DEMO_METRICS as Metric[]) : []
  } else if (space) {
    const { data } = await supabase
      .from('metrics')
      .select('*')
      .eq('space_id', (space as { id: string }).id)
      .order('category', { ascending: true })
    metrics = (data as Metric[]) || []
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="Behaviors"
        subtitle="Configure behavioral metrics for your space"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <MetricsManager 
          space={space}
          initialMetrics={metrics}
        />
      </div>
    </div>
  )
}
