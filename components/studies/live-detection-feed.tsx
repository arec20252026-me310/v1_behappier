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
}

export function LiveDetectionFeed({ studyId, status, limit = 4, demoDetections, large = false }: LiveDetectionFeedProps) {
  const [detections, setDetections] = useState<DetectionRow[]>(demoDetections ?? [])
  const instanceId = useId()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  useEffect(() => {
    if (demoDetections) return

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

  if (detections.length === 0) {
    return (
      <div className={`flex items-center gap-1.5 text-muted-foreground/60 py-1 ${large ? "text-2xl" : "text-xs"}`}>
        <Activity className={`animate-pulse ${large ? "h-7 w-7" : "h-3 w-3"}`} />
        <span>Waiting for detections…</span>
      </div>
    )
  }

  return (
    <div className={large ? "space-y-6" : "space-y-1.5"}>
      {detections.slice().reverse().map((d, i) => {
        const behaviors = Array.isArray(d.detected_behaviors) ? d.detected_behaviors : []
        const behaviorText = behaviors.map(b => `${b.name}: ${b.value} ${b.unit}`).join(", ")
        return (
          <div key={i} className={`text-muted-foreground leading-snug ${large ? "text-xl" : "text-xs"}`}>
            <span className={`font-mono text-muted-foreground/60 ${large ? "block text-lg mb-2" : "mr-1.5"}`}>{d.timestamp_pt}</span>
            {behaviorText && <span className={`text-foreground/90 ${large ? "block text-5xl font-bold leading-tight" : "mr-1.5 text-foreground/70"}`}>{behaviorText}</span>}
            {d.notes && <span className={`italic ${large ? "block text-2xl text-muted-foreground mt-2" : ""}`}>"{d.notes}"</span>}
          </div>
        )
      })}
    </div>
  )
}
