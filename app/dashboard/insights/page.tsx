import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsList } from "@/components/insights/insights-list"
import type { DetectionRow } from "@/components/insights/insights-list"
import { MarkInsightsViewed } from "@/components/insights/mark-insights-viewed"
import { getDemoScenario } from "@/lib/demo-mode"
import { isReviewMode } from "@/lib/review-mode"
import { BE_INSIGHT_OUTPUT, BE_STUDY_COMPLETE, DEMO_METRICS } from "@/lib/demo-seeds"

export default async function InsightsPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const review = !demo && await isReviewMode()
  const supabase = await createClient()

  const { data: outputs } = demo
    ? { data: (scenario === "study-complete" || scenario === "model-created") ? [BE_INSIGHT_OUTPUT] : [] }
    : await supabase
        .from("BE_insight_outputs")
        .select("*")
        .order("created_at", { ascending: false })

  const studyIds = (outputs ?? []).map((o: { study_id: string }) => o.study_id).filter(Boolean)

  let studyDurations: Record<string, number> = {}
  let studyGoals: Record<string, string> = {}
  if (demo && (scenario === "study-complete" || scenario === "model-created")) {
    studyDurations = { [BE_STUDY_COMPLETE.study_id]: BE_STUDY_COMPLETE.duration_seconds * 1000 }
    const demoName = (BE_STUDY_COMPLETE.metadata as Record<string, unknown>)?.study_name
    if (typeof demoName === "string" && demoName) studyGoals[BE_STUDY_COMPLETE.study_id] = demoName
  } else if (studyIds.length > 0) {
    const { data: studies } = await supabase
      .from("BE_studies")
      .select("study_id, duration_seconds, study_name")
      .in("study_id", studyIds)
    for (const s of (studies ?? []) as { study_id: string; duration_seconds: number | null; study_name: string | null }[]) {
      if (s.duration_seconds) studyDurations[s.study_id] = s.duration_seconds * 1000
      if (s.study_name) studyGoals[s.study_id] = s.study_name
    }
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
      DEMO_METRICS.map(m => [m.name, withCitation(m.description, m.literature_reference)])
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
        <InsightsList outputs={outputs || []} detectionsByStudy={detectionsByStudy} reviewMode={review} studyDurations={studyDurations} metricDescriptions={metricDescriptions} studyGoals={studyGoals} />
      </div>
    </div>
  )
}
