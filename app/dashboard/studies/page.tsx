import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { StudiesManager } from "@/components/studies/studies-manager"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { getDefaultSpace } from "@/lib/spaces"
import {
  DEMO_SPACE, ZONES, DEMO_METRICS,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE, DEMO_DETECTIONS, STUDY_ID,
  DEMO_LGQ_SPACE, ZONES_LGQ, LGQ_SPACE_ID,
  BE_STUDY_IN_PROGRESS_LGQ, BE_STUDY_COMPLETE_LGQ, DEMO_DETECTIONS_LGQ, LGQ_STUDY_ID,
} from "@/lib/demo-seeds"

export default async function StudiesPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  const demoSpaceId = await getDemoSpaceId()
  const isLGQ = demoSpaceId === LGQ_SPACE_ID

  const hasSpace = demo && scenario !== "blank"
  const space = hasSpace
    ? (isLGQ ? DEMO_LGQ_SPACE : DEMO_SPACE)
    : demo ? null : await getDefaultSpace()
  const spaceName = space?.name ?? undefined

  if (!demo) {
    // Sync status for any studies n8n has already marked complete
    await supabase
      .from("BE_studies")
      .update({ status: "complete" })
      .eq("current_stage", "complete")
      .neq("status", "complete")
  }

  const hasStudy = demo && (scenario === "study-in-progress" || scenario === "study-complete" || scenario === "model-created")

  const beStudies = demo
    ? (scenario === "study-in-progress"
        ? [isLGQ ? BE_STUDY_IN_PROGRESS_LGQ : BE_STUDY_IN_PROGRESS]
        : (scenario === "study-complete" || scenario === "model-created")
          ? [isLGQ ? BE_STUDY_COMPLETE_LGQ : BE_STUDY_COMPLETE]
          : [])
    : space ? ((await supabase
        .from("BE_studies")
        .select("*")
        .eq("building_id", space.id)
        .order("created_at", { ascending: false })).data ?? []) : []

  const zones = demo
    ? (hasSpace ? (isLGQ ? ZONES_LGQ : ZONES) : [])
    : space ? ((await supabase.from("zones").select("*").eq("space_id", space.id)).data ?? []) : []

  let metrics
  if (demo) {
    if (!hasStudy) {
      metrics = []
    } else if (isLGQ) {
      const { data } = await supabase.from("metrics").select("*").eq("space_id", LGQ_SPACE_ID).eq("is_active", true)
      metrics = data ?? []
    } else {
      metrics = DEMO_METRICS.filter(m => m.is_active)
    }
  } else {
    metrics = space ? ((await supabase.from("metrics").select("*").eq("space_id", space.id).eq("is_active", true)).data ?? []) : []
  }

  const cameras = demo ? [] : ((await supabase.from("cameras").select("*")).data ?? [])

  const demoStudyId = isLGQ ? LGQ_STUDY_ID : STUDY_ID
  const demoDetections = isLGQ ? DEMO_DETECTIONS_LGQ : DEMO_DETECTIONS

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
          demo={demo}
          spaceName={spaceName}
          demoDetectionsByStudy={
            demo && hasStudy
              ? { [demoStudyId]: demoDetections }
              : undefined
          }
        />
      </div>
    </div>
  )
}
