"use client"

import { useEffect, useRef, useState } from "react"
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
  const paneRef = useRef<HTMLDivElement>(null)
  const [paneSize, setPaneSize] = useState({ w: 0, h: 0 })

  const isLive = activeStudies.some(
    s => s.monitoredZoneId === zone?.id && s.status === "running"
  )

  // Measure left pane dimensions so the crop math uses real pixels
  useEffect(() => {
    const el = paneRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setPaneSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

    // Subscribing by zone_id (not study_id) means this auto-transitions across studies
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

  // Compute cropped image position: scale image so the zone region fills the pane width,
  // then center the zone vertically within the pane.
  const cropImg = (() => {
    const { floorPlanUrl, effectiveCols, effectiveRows, imgOffsetXFrac, imgOffsetYFrac, imgAspectRatio } = mapGeometry
    if (!floorPlanUrl || !zone || !imgAspectRatio || paneSize.w === 0 || paneSize.h === 0) return null

    // Fraction of the image (0–1) that the zone occupies, accounting for letterbox padding
    const contentW = 1 - 2 * imgOffsetXFrac
    const contentH = 1 - 2 * imgOffsetYFrac
    const zoneXstart = (zone.grid_x / effectiveCols) / contentW
    const zoneXwidth = (zone.grid_width / effectiveCols) / contentW
    const zoneYstart = (zone.grid_y / effectiveRows) / contentH
    const zoneYheight = (zone.grid_height / effectiveRows) / contentH

    // Scale image so the zone's width exactly fills the pane width
    const imgW = paneSize.w / zoneXwidth
    const imgH = imgW / imgAspectRatio

    const imgLeft = -zoneXstart * imgW
    // Center zone vertically in pane
    const zoneTopPx = zoneYstart * imgH
    const zoneHeightPx = zoneYheight * imgH
    const imgTop = -(zoneTopPx + (zoneHeightPx - paneSize.h) / 2)

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
            ref={paneRef}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span className="text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {zone?.name}
              </span>
              {isLive && (
                <span className="flex items-center gap-2 text-green-400 text-xl font-semibold">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>

          {/* Right pane: metrics + detection text — only when a study is running for this zone */}
          {isLive && (
            <div className="flex-1 flex flex-col border-l border-border">
              {/* Metric tiles side by side — always flex-1 */}
              <div className="flex-1 min-h-0 flex flex-row border-b border-border">
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Occupancy
                  </span>
                  <span className="text-[8rem] font-bold leading-none tabular-nums">
                    {values.occupancy !== null ? values.occupancy : "—"}
                  </span>
                </div>
                <div className="border-l border-border" />
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground text-center">
                    Collaboration Index
                  </span>
                  <span className="text-[8rem] font-bold leading-none tabular-nums">
                    {values.collaborationIndex !== null ? values.collaborationIndex : "—"}
                  </span>
                </div>
              </div>

              {/* Collapsible detection text — flex-1 when expanded, shrink-0 when collapsed */}
              <div className={notesExpanded ? "flex-1 min-h-0 flex flex-col" : "shrink-0"}>
                <button
                  className="w-full flex items-center justify-between px-6 py-3 border-b border-border hover:bg-muted/40 transition-colors shrink-0"
                  onClick={() => setNotesExpanded(v => !v)}
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Latest Detection
                  </span>
                  {notesExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {notesExpanded && (
                  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                    {values.timestamp && (
                      <p className="text-xs text-muted-foreground mb-3">{values.timestamp}</p>
                    )}
                    <p className="text-base leading-relaxed">
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
