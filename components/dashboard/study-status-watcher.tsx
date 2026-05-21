"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const ACTIVE_STATUSES = ["running", "analyzing"]

interface StudyStatusWatcherProps {
  activeStudyId: string
}

export function StudyStatusWatcher({ activeStudyId }: StudyStatusWatcherProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let refreshed = false

    function triggerRefresh() {
      if (!refreshed) {
        refreshed = true
        router.refresh()
      }
    }

    async function pollStatus() {
      const { data } = await supabase
        .from("BE_studies")
        .select("status")
        .eq("study_id", activeStudyId)
        .single()
      if (data && !ACTIVE_STATUSES.includes((data as { status: string }).status)) {
        triggerRefresh()
      }
    }

    // Poll every 20 seconds as primary mechanism
    pollStatus()
    const interval = setInterval(pollStatus, 20000)

    // Realtime as fast-path (now that BE_studies is in the publication)
    const channel = supabase
      .channel("study-status-watcher-" + activeStudyId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "BE_studies",
          filter: `study_id=eq.${activeStudyId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status
          if (newStatus && !ACTIVE_STATUSES.includes(newStatus)) {
            triggerRefresh()
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [activeStudyId, router])

  return null
}
