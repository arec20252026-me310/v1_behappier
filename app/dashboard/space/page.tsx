import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { SpaceEditor } from "@/components/space/space-editor"

export default async function SpacePage() {
  const supabase = await createClient()
  
  // Fetch the first space or create a default one
  let { data: space } = await supabase
    .from('spaces')
    .select('*')
    .limit(1)
    .single()

  // Fetch zones for the space
  let zones = []
  if (space) {
    const { data } = await supabase
      .from('zones')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: true })
    zones = data || []
  }

  // Fetch cameras
  const { data: cameras } = await supabase
    .from('cameras')
    .select('*')

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="Space Editor" 
        subtitle="Configure your building layout and zones"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <SpaceEditor 
          space={space} 
          initialZones={zones} 
          cameras={cameras || []}
        />
      </div>
    </div>
  )
}
