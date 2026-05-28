import { createClient } from "@/lib/supabase/server"
import type { Space } from "@/lib/types"

export async function getDefaultSpace(): Promise<Space | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("spaces")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .single()
  if (data) return data as Space
  // Fallback: return the first space if none is marked default
  const { data: fallback } = await supabase
    .from("spaces")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  return (fallback as Space) ?? null
}

export async function getAllSpaces(): Promise<Space[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("spaces")
    .select("*")
    .order("created_at", { ascending: true })
  return (data as Space[]) ?? []
}
