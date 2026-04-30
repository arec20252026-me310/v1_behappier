import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { SpaceEditor } from "@/components/space/space-editor"

export default async function SpacePage() {
  const supabase = await createClient()

  let { data: space } = await supabase
    .from("spaces")
    .select("*")
    .limit(1)
    .single()

  let zones = []
  if (space) {
    const { data } = await supabase
      .from("zones")
      .select("*")
      .eq("space_id", space.id)
      .order("created_at", { ascending: true })
    zones = data || []
  }

  // Real camera assignments (zone_id → camera record)
  const { data: cameras } = await supabase
    .from("cameras")
    .select("*")

  // Available HA cameras to assign
  const { data: haCameras } = await supabase
    .from("ha_camera_mappings")
    .select("*")
    .eq("is_active", true)
    .order("ha_friendly_name")

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Space Builder"
        subtitle="Configure your building layout, zones, and camera assignments"
      />

      <div className="flex-1 p-6 overflow-auto">
        <SpaceEditor
          space={space}
          initialZones={zones}
          initialCameras={cameras || []}
          haCameras={haCameras || []}
        />
      </div>
    </div>
  )
}
