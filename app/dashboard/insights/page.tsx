import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsList } from "@/components/insights/insights-list"

export default async function InsightsPage() {
  const supabase = await createClient()
  
  // Fetch the space
  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .limit(1)
    .single()

  // Fetch insights
  let insights = []
  if (space) {
    const { data } = await supabase
      .from('insights')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false })
    insights = data || []
  }

  // Fetch zones and studies for context
  const { data: zones } = await supabase.from('zones').select('id, name')
  const { data: studies } = await supabase.from('studies').select('id, name')

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="Insights" 
        subtitle="AI-generated actionable insights from your data"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <InsightsList 
          insights={insights}
          zones={zones || []}
          studies={studies || []}
        />
      </div>
    </div>
  )
}
