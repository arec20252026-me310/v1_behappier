import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { StudiesManager } from "@/components/studies/studies-manager"

export default async function StudiesPage() {
  const supabase = await createClient()
  
  // Fetch the space
  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .limit(1)
    .single()

  // Fetch studies
  let studies = []
  if (space) {
    const { data } = await supabase
      .from('studies')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false })
    studies = data || []
  }

  // Fetch zones and metrics for study configuration
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
  
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('is_active', true)

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="Micro-Studies" 
        subtitle="Run focused analysis sessions to test hypotheses"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <StudiesManager 
          space={space}
          initialStudies={studies}
          zones={zones || []}
          metrics={metrics || []}
        />
      </div>
    </div>
  )
}
