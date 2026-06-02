"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Zone } from "@/lib/types"

export interface MapGeometry {
  floorPlanUrl: string | null
  effectiveCols: number
  effectiveRows: number
  imgOffsetXFrac: number
  imgOffsetYFrac: number
  imgAspectRatio: number | null
}

interface ActiveStudyEntry {
  study_id: string
  status: string
  monitoredZoneId?: string | null
}

interface DetectionValues {
  occupancy: number | null
  collaborationIndex: number | null
  notes: string | null
  timestamp: string | null
}

interface ZoneDetailDialogProps {
  zone: Zone | null
  onClose: () => void
  activeStudies: ActiveStudyEntry[]
  mapGeometry: MapGeometry
}

type RawDetectionRow = {
  detected_behaviors: unknown
  notes: string | null
  timestamp_pt: string
}

function parseDetectionRow(row: RawDetectionRow): DetectionValues {
  const behaviors = Array.isArray(row.detected_behaviors)
    ? (row.detected_behaviors as { name: string; value: number | string }[])
    : []
  const occ = behaviors.find(b => b.name === "Occupancy")
  const collab = behaviors.find(b => b.name === "Collaboration Index")
  return {
    occupancy: occ !== undefined ? Number(occ.value) : null,
    collaborationIndex: collab !== undefined ? Number(collab.value) : null,
    notes: row.notes,
    timestamp: row.timestamp_pt,
  }
}

export function ZoneDetailDialog({ zone, onClose, activeStudies, mapGeometry }: ZoneDetailDialogProps) {
  const [values, setValues] = useState<DetectionValues>({
    occupancy: null,
    collaborationIndex: null,
    notes: null,
    timestamp: null,
  })
  const [notesExpanded, setNotesExpanded] = useState(true)
  // Load floor plan AR locally — browser cache makes this instant after heatmap loads it
  const [localAR, setLocalAR] = useState<number | null>(mapGeometry.imgAspectRatio)

  const isLive = activeStudies.some(
    s => s.monitoredZoneId === zone?.id && s.status === "running"
  )

  useEffect(() => {
    const ar = mapGeometry.imgAspectRatio
    if (ar) { setLocalAR(ar); return }
    const url = mapGeometry.floorPlanUrl
    if (!url) return
    const img = new Image()
    img.onload = () => setLocalAR(img.naturalWidth / img.naturalHeight)
    img.src = url
  }, [mapGeometry.floorPlanUrl, mapGeometry.imgAspectRatio])

  useEffect(() => {
    if (!zone) return

    setValues({ occupancy: null, collaborationIndex: null, notes: null, timestamp: null })
    setNotesExpanded(true)

    const supabase = createClient()

    supabase
      .from("BE_behavior_detections")
      .select("detected_behaviors, notes, timestamp_pt")
      .eq("zone_id", zone.id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setValues(parseDetectionRow(data[0] as RawDetectionRow))
      })

    // Subscribing by zone_id (not study_id) auto-transitions across studies
    const channel = supabase
      .channel(`zone-detail-${zone.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "BE_behavior_detections",
        filter: `zone_id=eq.${zone.id}`,
      }, (payload) => {
        setValues(parseDetectionRow(payload.new as RawDetectionRow))
        setNotesExpanded(true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [zone?.id])

  // Compute cropped image position using object-contain semantics for the zone:
  // scale the image so the zone fits WITHIN the pane (neither cropping the zone
  // width nor height), then center the zone in the pane.
  //
  // Uses window dimensions directly — avoids clientWidth=0 in Radix portals.
  const cropImg = (() => {
    if (typeof window === "undefined") return null
    const { floorPlanUrl, effectiveCols, effectiveRows, imgOffsetXFrac, imgOffsetYFrac } = mapGeometry
    if (!floorPlanUrl || !zone || !localAR) return null

    const paneW = window.innerWidth * 0.92 * (isLive ? 0.5 : 1.0)
    const paneH = window.innerHeight * 0.92

    // Zone's position in image-normalized coords (0–1 within the actual image content)
    const contentW = 1 - 2 * imgOffsetXFrac
    const contentH = 1 - 2 * imgOffsetYFrac
    const zoneXstart = (zone.grid_x / effectiveCols) / contentW
    const zoneXwidth = (zone.grid_width / effectiveCols) / contentW
    const zoneYstart = (zone.grid_y / effectiveRows) / contentH
    const zoneYheight = (zone.grid_height / effectiveRows) / contentH

    // Object-contain: pick the scale that makes the zone fit within the pane
    const zoneAR = (zoneXwidth / zoneYheight) * localAR
    const paneAR = paneW / paneH
    let imgW: number, imgH: number
    if (zoneAR > paneAR) {
      // Zone wider than pane → constrain by width
      imgW = paneW / zoneXwidth
      imgH = imgW / localAR
    } else {
      // Zone taller than pane → constrain by height
      imgH = paneH / zoneYheight
      imgW = imgH * localAR
    }

    // Center the zone in the pane
    const zonePxW = zoneXwidth * imgW
    const zonePxH = zoneYheight * imgH
    const imgLeft = (paneW - zonePxW) / 2 - zoneXstart * imgW
    const imgTop = (paneH - zonePxH) / 2 - zoneYstart * imgH

    return { src: floorPlanUrl, imgW, imgH, imgLeft, imgTop }
  })()

  return (
    <Dialog open={!!zone} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[92vw] w-[92vw] h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{zone?.name ?? "Zone Detail"}</DialogTitle>
        <DialogDescription className="sr-only">Live zone detail view</DialogDescription>

        <div className="flex flex-row h-full">
          {/* Left pane: cropped floor plan — full width when no study running */}
          <div
            className={cn("relative overflow-hidden shrink-0", isLive ? "w-1/2" : "w-full")}
            style={{ backgroundColor: zone?.color ?? "#6366f1" }}
          >
            {cropImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cropImg.src}
                alt=""
                style={{
                  position: "absolute",
                  width: cropImg.imgW,
                  height: cropImg.imgH,
                  left: cropImg.imgLeft,
                  top: cropImg.imgTop,
                  pointerEvents: "none",
                }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{ backgroundColor: zone?.color ?? "#6366f1", opacity: 0.2 }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <span className="text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {zone?.name}
              </span>
              {isLive ? (
                <span className="flex items-center gap-2 text-green-400 text-xl font-semibold">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-white/70 text-xl font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  Waiting for next study…
                </span>
              )}
            </div>
          </div>

          {/* Right pane: metrics + detection text — only when a study is running for this zone */}
          {isLive && (
            <div className="flex-1 flex flex-col border-l border-border">
              {/* Top 1/3: metric tiles side by side */}
              <div className="h-1/3 shrink-0 flex flex-row border-b border-border">
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
                  <span className="text-xl font-semibold uppercase tracking-widest text-muted-foreground">
                    Occupancy
                  </span>
                  <span className="text-[6rem] font-bold leading-none tabular-nums">
                    {values.occupancy !== null ? values.occupancy : "—"}
                  </span>
                </div>
                <div className="border-l border-border" />
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
                  <span className="text-xl font-semibold uppercase tracking-widest text-muted-foreground text-center">
                    Collaboration Index
                  </span>
                  <span className="text-[6rem] font-bold leading-none tabular-nums">
                    {values.collaborationIndex !== null ? values.collaborationIndex : "—"}
                  </span>
                </div>
              </div>

              {/* Bottom 2/3: collapsible detection text */}
              <div className="flex-1 min-h-0 flex flex-col">
                <button
                  className="w-full flex items-center justify-between px-8 py-4 border-b border-border hover:bg-muted/40 transition-colors shrink-0"
                  onClick={() => setNotesExpanded(v => !v)}
                >
                  <span className="text-lg font-semibold uppercase tracking-widest text-muted-foreground">
                    Latest Detection
                  </span>
                  {notesExpanded
                    ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </button>
                {notesExpanded && (
                  <div className="flex-1 min-h-0 overflow-y-auto px-8 py-5">
                    {values.timestamp && (
                      <p className="text-base text-muted-foreground mb-4">{values.timestamp}</p>
                    )}
                    <p className="text-xl leading-relaxed">
                      {values.notes ?? "Waiting for detection…"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
