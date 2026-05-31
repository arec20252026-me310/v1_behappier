import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsList } from "@/components/insights/insights-list"
import type { DetectionRow } from "@/components/insights/insights-list"
import { MarkInsightsViewed } from "@/components/insights/mark-insights-viewed"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { isReviewMode } from "@/lib/review-mode"
import { getDefaultSpace } from "@/lib/spaces"
import {
  BE_INSIGHT_OUTPUT, BE_STUDY_COMPLETE, DEMO_METRICS, DEMO_SPACE,
  DEMO_LGQ_SPACE, LGQ_SPACE_ID, BE_INSIGHT_OUTPUT_LGQ, BE_STUDY_COMPLETE_LGQ, DEMO_METRICS_LGQ,
  DEMO_EXPE_SPACE, EXPE_SPACE_ID, BE_INSIGHT_OUTPUT_EXPE, BE_STUDY_COMPLETE_EXPE, DEMO_METRICS_EXPE,
} from "@/lib/demo-seeds"

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const review = !demo && await isReviewMode()
  const supabase = await createClient()

  const demoSpaceId = await getDemoSpaceId()
  const isLGQ  = demoSpaceId === LGQ_SPACE_ID
  const isExpe = demoSpaceId === EXPE_SPACE_ID

  const defaultSpace = demo ? (isLGQ ? DEMO_LGQ_SPACE : isExpe ? DEMO_EXPE_SPACE : DEMO_SPACE) : await getDefaultSpace()
  const spaceName = defaultSpace?.name ?? undefined

  // For real data, only show insights from studies belonging to the default space
  let spaceStudyIds: string[] = []
  if (!demo && defaultSpace) {
    const { data: spaceStudies } = await supabase
      .from("BE_studies")
      .select("study_id")
      .eq("building_id", defaultSpace.id)
    spaceStudyIds = (spaceStudies ?? []).map((s: { study_id: string }) => s.study_id)
  }

  const { data: outputs } = demo
    ? { data: (scenario === "study-complete" || scenario === "model-created") ? [isLGQ ? BE_INSIGHT_OUTPUT_LGQ : isExpe ? BE_INSIGHT_OUTPUT_EXPE : BE_INSIGHT_OUTPUT] : [] }
    : spaceStudyIds.length > 0
      ? await supabase
          .from("BE_insight_outputs")
          .select("*")
          .in("study_id", spaceStudyIds)
          .order("created_at", { ascending: false })
      : { data: [] }

  const studyIds = (outputs ?? []).map((o: { study_id: string }) => o.study_id).filter(Boolean)

  let studyDurations: Record<string, number> = {}
  let studyGoals: Record<string, string> = {}
  let camerasByStudy: Record<string, string> = {}
  if (demo && (scenario === "study-complete" || scenario === "model-created")) {
    const demoStudy = isLGQ ? BE_STUDY_COMPLETE_LGQ : isExpe ? BE_STUDY_COMPLETE_EXPE : BE_STUDY_COMPLETE
    studyDurations = { [demoStudy.study_id]: demoStudy.duration_seconds * 1000 }
    const demoName = (demoStudy.metadata as Record<string, unknown>)?.study_name
    if (typeof demoName === "string" && demoName) studyGoals[demoStudy.study_id] = demoName
  } else if (studyIds.length > 0) {
    const { data: studies } = await supabase
      .from("BE_studies")
      .select("study_id, duration_seconds, study_name, metadata")
      .in("study_id", studyIds)
    for (const s of (studies ?? []) as { study_id: string; duration_seconds: number | null; study_name: string | null; metadata?: Record<string, unknown> | null }[]) {
      if (s.duration_seconds) studyDurations[s.study_id] = s.duration_seconds * 1000
      if (s.study_name) studyGoals[s.study_id] = s.study_name
    }
    camerasByStudy = Object.fromEntries(
      ((studies ?? []) as { study_id: string; metadata?: Record<string, unknown> | null }[])
        .filter(s => typeof s.metadata?.camera_id === "string")
        .map(s => [s.study_id, s.metadata!.camera_id as string])
    )
  }

  // Build name → description+citation map for legend info buttons
  // Quotes the title portion of the citation: "Author (YYYY). Title" → Author (YYYY). "Title"
  function withCitation(description: string, ref: string | null): string {
    if (!ref) return description
    const cited = ref.replace(/^(.*?\(\d{4}\)\.) (.+)$/, '$1 "$2"')
    return `${description} — ${cited}`
  }

  let metricDescriptions: Record<string, string> = {}
  if (demo) {
    metricDescriptions = Object.fromEntries(
      (isLGQ ? DEMO_METRICS_LGQ : isExpe ? DEMO_METRICS_EXPE : DEMO_METRICS).map(m => [m.name, withCitation(m.description, m.literature_reference)])
    )
  } else {
    const { data: metrics } = await supabase.from("metrics").select("name, description, literature_reference")
    for (const m of (metrics ?? []) as { name: string; description: string; literature_reference: string | null }[]) {
      metricDescriptions[m.name] = withCitation(m.description, m.literature_reference)
    }
  }

  let detectionsByStudy: Record<string, DetectionRow[]> = {}
  if (review && studyIds.length > 0) {
    const { data: detections } = await supabase
      .from("BE_behavior_detections")
      .select("id, study_id, image_id, timestamp_pt, notes, detected_behaviors")
      .in("study_id", studyIds)
      .order("timestamp", { ascending: true })

    for (const d of (detections ?? []) as DetectionRow[]) {
      if (!detectionsByStudy[d.study_id]) detectionsByStudy[d.study_id] = []
      detectionsByStudy[d.study_id].push(d)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Insights"
        subtitle="AI-generated findings and recommendations from your studies"
      />

      <MarkInsightsViewed />
      <div className="flex-1 p-6 overflow-auto">
        <InsightsList outputs={outputs || []} detectionsByStudy={detectionsByStudy} camerasByStudy={camerasByStudy} reviewMode={review} studyDurations={studyDurations} metricDescriptions={metricDescriptions} studyGoals={studyGoals} spaceName={spaceName} />
      </div>
    </div>
  )
}
