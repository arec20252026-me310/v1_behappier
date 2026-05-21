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
}

export function LiveDetectionFeed({ studyId, status, limit = 4, demoDetections }: LiveDetectionFeedProps) {
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
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 py-1">
        <Activity className="h-3 w-3 animate-pulse" />
        <span>Waiting for detections…</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {detections.slice().reverse().map((d, i) => {
        const behaviors = Array.isArray(d.detected_behaviors) ? d.detected_behaviors : []
        const behaviorText = behaviors.map(b => `${b.name}: ${b.value} ${b.unit}`).join(", ")
        return (
          <div key={i} className="text-xs text-muted-foreground leading-snug">
            <span className="font-mono text-muted-foreground/60 mr-1.5">{d.timestamp_pt}</span>
            {behaviorText && <span className="text-foreground/70 mr-1.5">{behaviorText}</span>}
            {d.notes && <span className="italic">"{d.notes}"</span>}
          </div>
        )
      })}
    </div>
  )
}
