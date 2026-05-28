import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { StudiesManager } from "@/components/studies/studies-manager"
import { getDemoScenario } from "@/lib/demo-mode"
import {
  DEMO_SPACE, ZONES, DEMO_METRICS,
  BE_STUDY_IN_PROGRESS, BE_STUDY_COMPLETE, DEMO_DETECTIONS, STUDY_ID,
} from "@/lib/demo-seeds"

export default async function StudiesPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const supabase = await createClient()

  const hasSpace = demo && scenario !== "blank"
  const space = hasSpace
    ? DEMO_SPACE
    : demo ? null : (await supabase.from("spaces").select("*").limit(1).single()).data

  if (!demo) {
    // Sync status for any studies n8n has already marked complete
    await supabase
      .from("BE_studies")
      .update({ status: "complete" })
      .eq("current_stage", "complete")
      .neq("status", "complete")
  }

  const beStudies = demo
    ? (scenario === "study-in-progress" ? [BE_STUDY_IN_PROGRESS]
       : (scenario === "study-complete" || scenario === "model-created") ? [BE_STUDY_COMPLETE]
       : [])
    : ((await supabase
        .from("BE_studies")
        .select("*")
        .order("created_at", { ascending: false })).data ?? [])

  const zones = demo
    ? (hasSpace ? ZONES : [])
    : ((await supabase.from("zones").select("*")).data ?? [])

  const hasStudy = demo && (scenario === "study-in-progress" || scenario === "study-complete" || scenario === "model-created")
  const metrics = demo
    ? (hasStudy ? DEMO_METRICS.filter(m => m.is_active) : [])
    : ((await supabase
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
          demo={demo}
          demoDetectionsByStudy={
            demo && scenario === "study-in-progress"
              ? { [STUDY_ID]: DEMO_DETECTIONS }
              : undefined
          }
        />
      </div>
    </div>
  )
}
