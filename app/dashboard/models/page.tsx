import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { ModelsManager } from "@/components/models/models-manager"
import { getDemoScenario } from "@/lib/demo-mode"
import { DEMO_MODEL_DATASET, DEMO_FIT_ENTRIES, STUDY_ID } from "@/lib/demo-seeds"
import type { ParsedDataset } from "@/components/models/dataset-uploader"

export default async function ModelsPage() {
  const scenario = await getDemoScenario()
  const isModelDemo = scenario === "model-created"

  const supabase = await createClient()

  const studies = isModelDemo
    ? [{
        study_id: STUDY_ID,
        study_goal: "There is not much entry and exit in the loft. Track the number of occupants over time.",
        status: "complete",
        created_at: "2026-05-05T22:12:13Z",
        metadata: {},
      }]
    : ((await supabase
        .from("BE_studies")
        .select("study_id, study_goal, status, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(20)).data ?? [])

  const datasets = isModelDemo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? [DEMO_MODEL_DATASET as any]
    : ((await supabase
        .from("sensor_datasets")
        .select("*")
        .order("created_at", { ascending: false })).data ?? [])

  const demoActiveDataset: ParsedDataset | undefined = isModelDemo
    ? {
        filename: DEMO_MODEL_DATASET.name,
        columns: DEMO_MODEL_DATASET.columns,
        rows: DEMO_MODEL_DATASET.data as Record<string, string | number>[],
      }
    : undefined

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
          demoActiveDataset={demoActiveDataset}
          demoFitEntries={isModelDemo ? DEMO_FIT_ENTRIES : undefined}
          demoChartX={isModelDemo ? "CO2 (ppm)" : undefined}
          demoChartY={isModelDemo ? "Occupancy (count)" : undefined}
          demoSavedDatasetId={isModelDemo ? DEMO_MODEL_DATASET.id : undefined}
          demoDatasetName={isModelDemo ? DEMO_MODEL_DATASET.name : undefined}
          demoModelInputCols={isModelDemo ? ["CO2 (ppm)"] : undefined}
          demoModelOutputCol={isModelDemo ? "Occupancy (count)" : undefined}
          demoSelectedStudyId={isModelDemo ? STUDY_ID : undefined}
        />
      </div>
    </div>
  )
}
