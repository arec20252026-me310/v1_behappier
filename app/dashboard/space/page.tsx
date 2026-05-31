import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { SpaceEditor } from "@/components/space/space-editor"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { getAllSpaces, getDefaultSpace } from "@/lib/spaces"
import {
  DEMO_SPACE, ZONES, CAMERAS,
  DEMO_LGQ_SPACE, ZONES_LGQ, CAMERAS_LGQ, LGQ_SPACE_ID,
  DEMO_EXPE_SPACE, ZONES_EXPE, CAMERAS_EXPE, EXPE_SPACE_ID,
} from "@/lib/demo-seeds"
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
    allSpaces = scenario !== "blank" ? [DEMO_SPACE as Space, DEMO_LGQ_SPACE as Space, DEMO_EXPE_SPACE as Space] : []
    if (scenario !== "blank") {
      const cookieSpaceId = await getDemoSpaceId()
      const activeSpaceId = params.space_id ?? cookieSpaceId ?? null
      const isLGQ  = activeSpaceId === LGQ_SPACE_ID
      const isExpe = activeSpaceId === EXPE_SPACE_ID
      space   = isLGQ ? DEMO_LGQ_SPACE as Space  : isExpe ? DEMO_EXPE_SPACE as Space  : DEMO_SPACE as Space
      zones   = isLGQ ? ZONES_LGQ as Zone[]      : isExpe ? ZONES_EXPE as Zone[]      : ZONES as Zone[]
      cameras = isLGQ ? CAMERAS_LGQ as Camera[]  : isExpe ? CAMERAS_EXPE as Camera[]  : CAMERAS as Camera[]
    }
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
          key={space?.id ?? "new"}
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
