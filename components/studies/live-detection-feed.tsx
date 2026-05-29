"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Activity } from "lucide-react"

export interface DetectionRow {
  timestamp_pt: string
  detected_behaviors: { name: string; value: number | string; unit: string }[]
  notes: string | null
}

interface LiveDetectionFeedProps {
  studyId: string
  status: string
  limit?: number
  demoDetections?: DetectionRow[]
  large?: boolean
  studyCount?: number
}

export function LiveDetectionFeed({ studyId, status, limit = 4, demoDetections, large = false, studyCount = 1 }: LiveDetectionFeedProps) {
  const [detections, setDetections] = useState<DetectionRow[]>(demoDetections ? demoDetections.slice(-limit) : [])
  const instanceId = useId()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  useEffect(() => {
    if (demoDetections) { setDetections(demoDetections.slice(-limit)); return }

    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("BE_behavior_detections")
        .select("timestamp_pt, detected_behaviors, notes")
        .eq("study_id", studyId)
        .order("timestamp", { ascending: false })
        .limit(limit)
      if (data) setDetections((data as DetectionRow[]).reverse())
    }

    load()

    if (status !== "running") return

    const channel = supabase
      .channel("live-preview-" + studyId + instanceId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "BE_behavior_detections", filter: `study_id=eq.${studyId}` },
        (payload) => {
          setDetections(prev => {
            const next = [...prev, payload.new as DetectionRow]
            return next.slice(-limit)
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [studyId, status, limit, demoDetections])

  const behaviorSize = large
    ? studyCount >= 3 ? "text-base" : studyCount === 2 ? "text-3xl" : "text-5xl"
    : "text-foreground/70"
  const timestampSize = large
    ? studyCount >= 3 ? "text-xs" : studyCount === 2 ? "text-base" : "text-2xl"
    : ""
  const notesSize = large
    ? studyCount >= 3 ? "text-xs" : studyCount === 2 ? "text-lg" : "text-4xl"
    : ""
  const spacing = large
    ? studyCount >= 3 ? "space-y-1" : studyCount === 2 ? "space-y-4" : "space-y-6"
    : "space-y-1.5"
  const waitingSize = large
    ? studyCount >= 3 ? "text-sm" : studyCount === 2 ? "text-xl" : "text-2xl"
    : "text-xs"
  const iconSize = large
    ? studyCount >= 3 ? "h-3.5 w-3.5" : "h-7 w-7"
    : "h-3 w-3"

  if (detections.length === 0) {
    return (
      <div className={`flex items-center gap-1.5 text-muted-foreground/60 py-1 ${waitingSize}`}>
        <Activity className={`animate-pulse ${iconSize}`} />
        <span>Waiting for detections…</span>
      </div>
    )
  }

  return (
    <div className={spacing}>
      {detections.slice().reverse().map((d, i) => {
        const behaviors = Array.isArray(d.detected_behaviors) ? d.detected_behaviors : []
        const behaviorText = behaviors.map(b => `${b.name}: ${b.value} ${b.unit}`).join(", ")
        return (
          <div key={i} className={`text-muted-foreground leading-snug ${large ? "text-base" : "text-xs"}`}>
            <span className={`font-mono text-muted-foreground/60 ${large ? `block ${timestampSize} mb-1` : "mr-1.5"}`}>{d.timestamp_pt}</span>
            {behaviorText && <span className={`${large ? `block ${behaviorSize} font-bold leading-tight text-foreground/90` : "mr-1.5 text-foreground/70"}`}>{behaviorText}</span>}
            {d.notes && <span className={`italic ${large ? `block ${notesSize} text-muted-foreground mt-1` : ""}`}>"{d.notes}"</span>}
          </div>
        )
      })}
    </div>
  )
}
