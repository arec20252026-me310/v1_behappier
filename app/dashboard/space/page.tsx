import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { SpaceEditor } from "@/components/space/space-editor"
import { getDemoScenario } from "@/lib/demo-mode"
import { DEMO_SPACE, ZONES, CAMERA } from "@/lib/demo-seeds"
import type { HACameraMapping } from "@/lib/types"

export default async function SpacePage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  let space = null
  let zones: typeof ZONES = []
  let cameras: typeof CAMERA[] = []
  let haCameras: HACameraMapping[] = []

  if (demo) {
    if (scenario !== "blank") {
      space = DEMO_SPACE
      zones = ZONES
      cameras = [CAMERA]
    }
  } else {
    const { data: dbSpace } = await supabase.from("spaces").select("*").limit(1).single()
    space = dbSpace

    if (space) {
      const { data } = await supabase
        .from("zones")
        .select("*")
        .eq("space_id", space.id)
        .order("created_at", { ascending: true })
      zones = data || []
    }

    const { data: dbCameras } = await supabase.from("cameras").select("*")
    cameras = dbCameras || []

    const { data: dbHaCameras } = await supabase
      .from("ha_camera_mappings")
      .select("*")
      .eq("is_active", true)
      .order("ha_friendly_name")
    haCameras = dbHaCameras || []
  }

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
