import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { StudiesManager } from "@/components/studies/studies-manager"

export default async function StudiesPage() {
  const supabase = await createClient()

  const { data: space } = await supabase
    .from("spaces")
    .select("*")
    .limit(1)
    .single()

  // Sync status for any studies n8n has already marked complete
  await supabase
    .from("BE_studies")
    .update({ status: "complete" })
    .eq("current_stage", "complete")
    .neq("status", "complete")

  const { data: beStudies } = await supabase
    .from("BE_studies")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: zones } = await supabase
    .from("zones")
    .select("*")

  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("is_active", true)

  const { data: cameras } = await supabase
    .from("cameras")
    .select("*")

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Micro-Studies"
        subtitle="Launch AI-powered behavior studies and track their progress"
      />

      <div className="flex-1 p-6 overflow-auto">
        <StudiesManager
          space={space}
          initialStudies={beStudies || []}
          zones={zones || []}
          metrics={metrics || []}
          cameras={cameras || []}
        />
      </div>
    </div>
  )
}
