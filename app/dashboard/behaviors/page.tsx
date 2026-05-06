import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricsManager } from "@/components/metrics/metrics-manager"
import { getDemoScenario } from "@/lib/demo-mode"
import { DEMO_SPACE } from "@/lib/demo-seeds"
import type { Metric } from "@/lib/types"

export default async function MetricsPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  const space = demo
    ? (scenario !== "blank" ? DEMO_SPACE : null)
    : (await supabase.from('spaces').select('*').limit(1).single()).data

  let metrics: Metric[] = []
  if (!demo && space) {
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
