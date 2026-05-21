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
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeStudyId, router])

  return null
}
