import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/header"
import { ModelsManager } from "@/components/models/models-manager"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { getDefaultSpace } from "@/lib/spaces"
import {
  DEMO_MODEL_DATASET, DEMO_FIT_ENTRIES, STUDY_ID,
  DEMO_BEHAVIOR_DATASET, DEMO_SENSOR_DATASET, DEMO_MERGED_DATASET,
  DEMO_MODEL_DATASET_LGQ, DEMO_FIT_ENTRIES_LGQ, LGQ_STUDY_ID, LGQ_SPACE_ID,
  DEMO_BEHAVIOR_DATASET_LGQ, DEMO_MERGED_DATASET_LGQ,
  EXPE_SPACE_ID, EXPE_STUDY_ID,
} from "@/lib/demo-seeds"

export default async function ModelsPage() {
  const scenario = await getDemoScenario()
  const isDemo = scenario !== null
  const demoSpaceId = await getDemoSpaceId()
  const isLGQ  = demoSpaceId === LGQ_SPACE_ID
  const isExpe = demoSpaceId === EXPE_SPACE_ID

  const supabase = await createClient()
  const space = isDemo ? null : await getDefaultSpace()

  const demoStudy = isLGQ
    ? {
        study_id: LGQ_STUDY_ID,
        study_goal: "Monitor the Conference Room for occupancy during a working session.",
        status: "complete",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        metadata: { study_name: "LGQ Conference Room Study" },
      }
    : isExpe
    ? {
        study_id: EXPE_STUDY_ID,
        study_goal: "Monitor the Conference Room for occupancy during a working session.",
        status: "complete",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        metadata: { study_name: "LGQ Conference Room Study" },
      }
    : {
        study_id: STUDY_ID,
        study_goal: "There is not much entry and exit in the loft. Track the number of occupants over time.",
        status: "complete",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        metadata: { study_name: "ME310 Loft Occupancy Study" },
      }

  const useLGQData = isLGQ || isExpe
  const modelDataset = useLGQData ? DEMO_MODEL_DATASET_LGQ : DEMO_MODEL_DATASET
  const demoSelectedStudyId = isLGQ ? LGQ_STUDY_ID : isExpe ? EXPE_STUDY_ID : STUDY_ID

  // Studies dropdown — filtered to the default space
  const studies = isDemo
    ? (scenario === "study-complete" || scenario === "model-created" ? [demoStudy] : [])
    : space ? ((await supabase
        .from("BE_studies")
        .select("study_id, study_goal, status, created_at, metadata")
        .eq("building_id", space.id)
        .order("created_at", { ascending: false })
        .limit(20)).data ?? []) : []

  // Saved datasets — only model-created shows a pre-saved entry
  const datasets = isDemo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (scenario === "model-created" ? [(useLGQData ? DEMO_MODEL_DATASET_LGQ : DEMO_MODEL_DATASET) as any] : [])
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
          demoBehaviorDataset={scenario === "model-created" ? (useLGQData ? DEMO_BEHAVIOR_DATASET_LGQ : DEMO_BEHAVIOR_DATASET) : undefined}
          demoSensorDataset={scenario === "model-created" && !useLGQData ? DEMO_SENSOR_DATASET : undefined}
          demoMergedDataset={scenario === "model-created" ? (useLGQData ? DEMO_MERGED_DATASET_LGQ : DEMO_MERGED_DATASET) : undefined}
          demoFitEntries={scenario === "model-created" ? (useLGQData ? DEMO_FIT_ENTRIES_LGQ : DEMO_FIT_ENTRIES) : undefined}
          demoChartX={scenario === "model-created" ? (useLGQData ? "Time Step" : "CO2 (ppm)") : undefined}
          demoChartY={scenario === "model-created" ? "Occupancy (count)" : undefined}
          demoSavedDatasetId={scenario === "model-created" ? modelDataset.id : undefined}
          demoDatasetName={scenario === "model-created" ? modelDataset.name : undefined}
          demoModelInputCols={scenario === "model-created" ? (useLGQData ? ["Time Step"] : ["CO2 (ppm)"]) : undefined}
          demoModelOutputCol={scenario === "model-created" ? "Occupancy (count)" : undefined}
          demoSelectedStudyId={scenario === "model-created" ? demoSelectedStudyId : undefined}
        />
      </div>
    </div>
  )
}
