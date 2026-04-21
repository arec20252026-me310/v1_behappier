import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { MetricCards } from "@/components/dashboard/metric-cards"
import { RecentInsights } from "@/components/dashboard/recent-insights"
import { ActiveStudies } from "@/components/dashboard/active-studies"
import { OccupancyChart } from "@/components/dashboard/occupancy-chart"
import { ZoneOverview } from "@/components/dashboard/zone-overview"
import { SpaceHeatmap } from "@/components/dashboard/space-heatmap"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Fetch space data
  const { data: spaces } = await supabase
    .from('spaces')
    .select('*')
    .limit(1)
    .single()

  // Fetch zones for the space
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch active studies
  const { data: studies } = await supabase
    .from('studies')
    .select('*')
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch recent insights
  const { data: insights } = await supabase
    .from('insights')
    .select('*')
    .eq('is_acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch metrics
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('is_active', true)

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="Dashboard" 
        subtitle={spaces?.name || "Get started by setting up your space"}
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <MetricCards 
          zonesCount={zones?.length || 0}
          studiesCount={studies?.length || 0}
          insightsCount={insights?.length || 0}
          metricsCount={metrics?.length || 0}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpaceHeatmap zones={zones || []} insights={insights || []} space={spaces} />
          <OccupancyChart />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ZoneOverview zones={zones || []} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActiveStudies studies={studies || []} />
          <RecentInsights insights={insights || []} />
        </div>
      </div>
    </div>
  )
}
