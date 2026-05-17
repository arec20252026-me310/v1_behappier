"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function saveDataset(
  name: string,
  studyId: string | null,
  columns: string[],
  data: Record<string, unknown>[],
  metadata: Record<string, unknown>
): Promise<{ id?: string; error?: string }> {
  if (!name.trim()) return { error: "Dataset name is required" }

  const supabase = getServiceClient()
  const { data: row, error } = await supabase
    .from("sensor_datasets")
    .insert({ name: name.trim(), study_id: studyId || null, columns, data, metadata })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/dashboard/models")
  return { id: row.id }
}

export async function saveModelFit(
  datasetId: string,
  studyId: string | null,
  name: string | null,
  modelType: string,
  config: Record<string, unknown>,
  parameters: Record<string, unknown>,
  metrics: Record<string, unknown>
): Promise<{ id?: string; error?: string }> {
  if (!datasetId) return { error: "Dataset ID is required" }

  const supabase = getServiceClient()
  const { data: row, error } = await supabase
    .from("model_fits")
    .insert({
      dataset_id: datasetId,
      study_id: studyId || null,
      name: name || null,
      model_type: modelType,
      config,
      parameters,
      metrics,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/dashboard/models")
  return { id: row.id }
}

export async function deleteDataset(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "No dataset ID" }

  const supabase = getServiceClient()
  const { error } = await supabase.from("sensor_datasets").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/models")
  return {}
}

export async function deleteModelFit(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "No model fit ID" }

  const supabase = getServiceClient()
  const { error } = await supabase.from("model_fits").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/models")
  return {}
}
