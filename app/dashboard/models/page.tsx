import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { ModelsManager } from "@/components/models/models-manager"
import { getDemoScenario } from "@/lib/demo-mode"
import {
  DEMO_MODEL_DATASET, DEMO_FIT_ENTRIES, STUDY_ID, BE_STUDY_COMPLETE,
  DEMO_BEHAVIOR_DATASET, DEMO_SENSOR_DATASET, DEMO_MERGED_DATASET,
} from "@/lib/demo-seeds"

const DEMO_STUDY = {
  study_id: STUDY_ID,
  study_goal: "There is not much entry and exit in the loft. Track the number of occupants over time.",
  status: "complete",
  created_at: BE_STUDY_COMPLETE.created_at,
  metadata: {},
}

export default async function ModelsPage() {
  const scenario = await getDemoScenario()
  const isDemo = scenario !== null

  const supabase = await createClient()

  // Studies dropdown
  // blank / space-ready / study-in-progress: none
  // study-complete / model-created: one demo study
  const studies = isDemo
    ? (scenario === "study-complete" || scenario === "model-created" ? [DEMO_STUDY] : [])
    : ((await supabase
        .from("BE_studies")
        .select("study_id, study_goal, status, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(20)).data ?? [])

  // Saved datasets — only model-created shows a pre-saved entry
  const datasets = isDemo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (scenario === "model-created" ? [DEMO_MODEL_DATASET as any] : [])
    : ((await supabase
        .from("sensor_datasets")
        .select("*")
        .order("created_at", { ascending: false })).data ?? [])

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Models"
        subtitle="Upload sensor data, fit models, and analyze trends"
      />
      <div className="flex-1 p-6 overflow-auto">
        <ModelsManager
          studies={studies}
          datasets={datasets}
          // model-created: pre-load behavior + sensor + merged, axes, and fits
          demoBehaviorDataset={scenario === "model-created" ? DEMO_BEHAVIOR_DATASET : undefined}
          demoSensorDataset={scenario === "model-created" ? DEMO_SENSOR_DATASET : undefined}
          demoMergedDataset={scenario === "model-created" ? DEMO_MERGED_DATASET : undefined}
          demoFitEntries={scenario === "model-created" ? DEMO_FIT_ENTRIES : undefined}
          demoChartX={scenario === "model-created" ? "CO2 (ppm)" : undefined}
          demoChartY={scenario === "model-created" ? "Occupancy (count)" : undefined}
          demoSavedDatasetId={scenario === "model-created" ? DEMO_MODEL_DATASET.id : undefined}
          demoDatasetName={scenario === "model-created" ? DEMO_MODEL_DATASET.name : undefined}
          demoModelInputCols={scenario === "model-created" ? ["CO2 (ppm)"] : undefined}
          demoModelOutputCol={scenario === "model-created" ? "Occupancy (count)" : undefined}
          demoSelectedStudyId={scenario === "model-created" ? STUDY_ID : undefined}
        />
      </div>
    </div>
  )
}
