import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { ModelsManager } from "@/components/models/models-manager"

export default async function ModelsPage() {
  const supabase = await createClient()

  const { data: studies } = await supabase
    .from("BE_studies")
    .select("study_id, study_goal, status, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: datasets } = await supabase
    .from("sensor_datasets")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Models"
        subtitle="Upload sensor data, fit models, and analyze trends"
      />
      <div className="flex-1 p-6 overflow-auto">
        <ModelsManager
          studies={studies ?? []}
          datasets={datasets ?? []}
        />
      </div>
    </div>
  )
}
