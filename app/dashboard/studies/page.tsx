import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { StudiesManager } from "@/components/studies/studies-manager"
import { isDemoMode } from "@/lib/demo-mode"

export default async function StudiesPage() {
  const demo = await isDemoMode()
  const supabase = await createClient()

  const space = demo ? null : (await supabase.from("spaces").select("*").limit(1).single()).data

  if (!demo) {
    // Sync status for any studies n8n has already marked complete
    await supabase
      .from("BE_studies")
      .update({ status: "complete" })
      .eq("current_stage", "complete")
      .neq("status", "complete")
  }

  const beStudies = demo ? [] : ((await supabase
    .from("BE_studies")
    .select("*")
    .order("created_at", { ascending: false })).data ?? [])

  const zones = demo ? [] : ((await supabase.from("zones").select("*")).data ?? [])

  const metrics = demo ? [] : ((await supabase
    .from("metrics")
    .select("*")
    .eq("is_active", true)).data ?? [])

  const cameras = demo ? [] : ((await supabase.from("cameras").select("*")).data ?? [])

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Micro-Studies"
        subtitle="Launch AI-powered behavior studies and track their progress"
      />

      <div className="flex-1 p-6 overflow-auto">
        <StudiesManager
          space={space}
          initialStudies={beStudies}
          zones={zones}
          metrics={metrics}
          cameras={cameras}
        />
      </div>
    </div>
  )
}
