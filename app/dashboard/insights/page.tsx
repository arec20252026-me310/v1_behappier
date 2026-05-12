import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { InsightsList } from "@/components/insights/insights-list"
import { DetectionReview } from "@/components/insights/detection-review"
import { getDemoScenario } from "@/lib/demo-mode"
import { isReviewMode } from "@/lib/review-mode"
import { BE_INSIGHT_OUTPUT } from "@/lib/demo-seeds"

interface DetectionRow {
  id: string
  study_id: string
  image_id: string
  timestamp_pt: string | null
  notes: string | null
  detected_behaviors: Array<{ name: string; value: number | string; unit?: string }> | null
}

export default async function InsightsPage() {
  const scenario = await getDemoScenario()
  const demo = scenario !== null
  const review = !demo && await isReviewMode()
  const supabase = await createClient()

  const { data: outputs } = demo
    ? { data: scenario === "study-complete" ? [BE_INSIGHT_OUTPUT] : [] }
    : await supabase
        .from("BE_insight_outputs")
        .select("*")
        .order("created_at", { ascending: false })

  let detections: DetectionRow[] = []
  let reviewStudyId: string | null = null
  if (review) {
    const { data: latestStudy } = await supabase
      .from("BE_studies")
      .select("study_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (latestStudy?.study_id) {
      reviewStudyId = latestStudy.study_id
      const { data } = await supabase
        .from("BE_behavior_detections")
        .select("id, study_id, image_id, timestamp_pt, notes, detected_behaviors")
        .eq("study_id", latestStudy.study_id)
        .order("timestamp", { ascending: true })
      detections = (data as DetectionRow[]) ?? []
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Insights"
        subtitle="AI-generated findings and recommendations from your studies"
      />

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {review && detections.length > 0 && (
          <DetectionReview detections={detections} studyId={reviewStudyId!} />
        )}
        <InsightsList outputs={outputs || []} />
      </div>
    </div>
  )
}
