import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricsManager } from "@/components/metrics/metrics-manager"

export default async function MetricsPage() {
  const supabase = await createClient()
  
  // Fetch the space
  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .limit(1)
    .single()

  // Fetch metrics for the space
  let metrics = []
  if (space) {
    const { data } = await supabase
      .from('metrics')
      .select('*')
      .eq('space_id', space.id)
      .order('category', { ascending: true })
    metrics = data || []
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
