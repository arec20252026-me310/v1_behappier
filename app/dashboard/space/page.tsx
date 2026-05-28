import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { SpaceEditor } from "@/components/space/space-editor"
import { getDemoScenario } from "@/lib/demo-mode"
import { getAllSpaces, getDefaultSpace } from "@/lib/spaces"
import { DEMO_SPACE, ZONES, CAMERAS } from "@/lib/demo-seeds"
import type { HACameraMapping, Space, Zone, Camera } from "@/lib/types"

export const dynamic = 'force-dynamic'

export default async function SpacePage({ searchParams }: { searchParams: Promise<{ space_id?: string; new?: string }> }) {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()
  const params = await searchParams

  let space: Space | null = null
  let zones: Zone[] = []
  let cameras: Camera[] = []
  let haCameras: HACameraMapping[] = []
  let allSpaces: Space[] = []

  if (demo) {
    if (scenario !== "blank") {
      space = DEMO_SPACE as Space
      zones = ZONES as Zone[]
      cameras = CAMERAS as Camera[]
    }
    allSpaces = scenario !== "blank" ? [DEMO_SPACE as Space] : []
  } else {
    allSpaces = await getAllSpaces()

    if (params.new === "1") {
      space = null
    } else if (params.space_id) {
      space = allSpaces.find(s => s.id === params.space_id) ?? await getDefaultSpace()
    } else {
      space = await getDefaultSpace()
    }

    if (space) {
      const { data } = await supabase
        .from("zones")
        .select("*")
        .eq("space_id", space.id)
        .order("created_at", { ascending: true })
      zones = (data as Zone[]) || []
    }

    const { data: dbCameras } = await supabase.from("cameras").select("*")
    cameras = (dbCameras as Camera[]) || []

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
          allSpaces={allSpaces}
          demo={demo}
        />
      </div>
    </div>
  )
}
