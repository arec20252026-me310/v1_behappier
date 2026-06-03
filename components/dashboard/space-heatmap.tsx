"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MapPin, AlertTriangle, ArrowRight, Maximize2, Users } from "lucide-react"
import { CameraMapIcon } from "@/components/space/camera-map-icon"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Zone, Insight, Space, Study, CameraPlacement, BELivePreviewMetrics, BEInsightOutput, BEStudy } from "@/lib/types"
import { cn } from "@/lib/utils"
import { LiveDetectionFeed, type DetectionRow } from "@/components/studies/live-detection-feed"
import { EXPE_SPACE_ID } from "@/lib/demo-seeds"
import { ZoneDetailDialog } from "@/components/dashboard/zone-detail-dialog"

interface ZoneWithOccupancy extends Zone {
  currentOccupancy: number
  occupancyPercentage: number
}

interface ActiveStudyEntry {
  study_id: string
  status: string
  monitoredZoneId: string | null
  study_name?: string | null
}

interface CompletedZoneInsight {
  zoneId: string
  studyId: string
  insights: BEInsightOutput
}

interface SpaceHeatmapProps {
  zones: Zone[]
  insights?: Insight[]
  space?: Space | null
  studies?: Study[]
  cameras?: CameraPlacement[]
  livePreviewMetrics?: BELivePreviewMetrics | null
  // Multi-study props (preferred)
  activeStudies?: ActiveStudyEntry[]
  completedZoneInsights?: CompletedZoneInsight[]
  // Legacy single-study props (used by demo mode)
  completedStudy?: BEStudy | null
  completedStudyInsights?: BEInsightOutput | null
  activeStudyId?: string
  activeStudyStatus?: string
  activeStudyMonitoredZoneId?: string
  demoDetections?: DetectionRow[]
  demoDetectionsPerStudy?: Record<string, DetectionRow[]>
  tracksOccupancy?: boolean
  isDemo?: boolean
}

interface BEInsightSelection {
  zoneName: string
  insights: string[]
  recommendations: string[]
  summary: string | null
}

function getZonesWithOccupancy(zones: Zone[]): ZoneWithOccupancy[] {
  return zones.map((zone) => ({ ...zone, currentOccupancy: 0, occupancyPercentage: 0 }))
}

function getHeatmapColor(hasInsight: boolean): string {
  return hasInsight
    ? "rgba(234, 179, 8, 0.45)"
    : "rgba(34, 197, 94, 0.35)"
}

function getZoneInsight(zoneId: string, insights: Insight[]): Insight | null {
  return insights.find(
    (insight) =>
      insight.related_zones?.includes(zoneId) &&
      !insight.is_acknowledged &&
      (insight.severity === "critical" || insight.severity === "warning")
  ) || null
}

function getLiveOccupancy(zoneName: string, zoneId: string, metrics: Record<string, unknown>): number | null {
  const candidates = [
    (metrics.zone_metrics as Record<string, unknown>)?.[zoneName],
    (metrics.zone_metrics as Record<string, unknown>)?.[zoneId],
    (metrics.zone_occupancy as Record<string, unknown>)?.[zoneName],
    (metrics.zone_occupancy as Record<string, unknown>)?.[zoneId],
    (metrics.zones as Record<string, unknown>)?.[zoneName],
    (metrics.zones as Record<string, unknown>)?.[zoneId],
  ]
  for (const candidate of candidates) {
    if (candidate == null) continue
    if (typeof candidate === "number") return candidate
    if (typeof candidate === "object") {
      const obj = candidate as Record<string, unknown>
      const pct = obj.percentage ?? obj.occupancy_pct ?? obj.pct ?? obj.count
      if (typeof pct === "number") return pct
    }
  }
  return null
}

function getLiveHeatmapColor(occupancy: number): string {
  if (occupancy >= 80) return "rgba(239, 68, 68, 0.45)"
  if (occupancy >= 50) return "rgba(234, 179, 8, 0.45)"
  return "rgba(34, 197, 94, 0.35)"
}

function getLiveCount(zoneName: string, zoneId: string, metrics: Record<string, unknown>): number | null {
  const candidates = [
    (metrics.zone_metrics as Record<string, unknown>)?.[zoneName],
    (metrics.zone_metrics as Record<string, unknown>)?.[zoneId],
    (metrics.zones as Record<string, unknown>)?.[zoneName],
    (metrics.zones as Record<string, unknown>)?.[zoneId],
  ]
  for (const candidate of candidates) {
    if (candidate == null) continue
    if (typeof candidate === "object") {
      const obj = candidate as Record<string, unknown>
      const count = obj.count ?? obj.occupant_count ?? obj.total_occupants
      if (typeof count === "number") return count
    }
  }
  return null
}

export function SpaceHeatmap({
  zones,
  insights = [],
  space,
  studies = [],
  cameras: cameraProp = [],
  livePreviewMetrics = null,
  activeStudies: activeStudiesProp,
  completedZoneInsights: completedZoneInsightsProp,
  completedStudy = null,
  completedStudyInsights = null,
  activeStudyId,
  activeStudyStatus,
  activeStudyMonitoredZoneId,
  demoDetections,
  demoDetectionsPerStudy,
  tracksOccupancy,
  isDemo = false,
}: SpaceHeatmapProps) {
  const router = useRouter()
  const [hasActiveStudy, setHasActiveStudy] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [selectedBEInsight, setSelectedBEInsight] = useState<BEInsightSelection | null>(null)
  const [cameras, setCameras] = useState<CameraPlacement[]>(cameraProp)
  const [insightsViewed, setInsightsViewed] = useState(false)
  const [isEnlarged, setIsEnlarged] = useState(false)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [detectionPanelHeight, setDetectionPanelHeight] = useState(0)
  const detectionPanelRef = useRef<HTMLDivElement>(null)
  // Per-zone occupancy: zoneId → latest count
  const [zoneOccupancies, setZoneOccupancies] = useState<Record<string, number>>({})

  const floorPlanUrl = space?.floor_plan_url

  // Track floor plan aspect ratio so zones align with the image under object-contain
  const [imgAspectRatio, setImgAspectRatio] = useState<number | null>(null)
  const floorPlanImgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = floorPlanImgRef.current
    if (!img || !floorPlanUrl) { setImgAspectRatio(null); return }
    const apply = (el: HTMLImageElement) => {
      if (el.naturalWidth && el.naturalHeight) setImgAspectRatio(el.naturalWidth / el.naturalHeight)
    }
    if (img.complete) apply(img)
    else img.addEventListener('load', () => apply(img), { once: true })
  }, [floorPlanUrl])

  // Merge multi-study prop with legacy single-study props
  const allActiveStudies: ActiveStudyEntry[] = useMemo(() => {
    if (activeStudiesProp && activeStudiesProp.length > 0) return activeStudiesProp
    if (activeStudyId) return [{
      study_id: activeStudyId,
      status: activeStudyStatus ?? "running",
      monitoredZoneId: activeStudyMonitoredZoneId ?? null,
    }]
    return []
  }, [activeStudiesProp, activeStudyId, activeStudyStatus, activeStudyMonitoredZoneId])

  // Merge multi-zone insight prop with legacy single-study insight props
  const allCompletedZoneInsights: CompletedZoneInsight[] = useMemo(() => {
    if (completedZoneInsightsProp && completedZoneInsightsProp.length > 0) return completedZoneInsightsProp
    const legacyZoneId = (
      (completedStudy?.metadata?.monitored_zone_id as string | undefined) ??
      ((completedStudy?.metadata?.target_zones as string[] | undefined)?.[0])
    )
    if (legacyZoneId && completedStudyInsights && completedStudy) {
      return [{ zoneId: legacyZoneId, studyId: completedStudy.study_id, insights: completedStudyInsights }]
    }
    return []
  }, [completedZoneInsightsProp, completedStudy, completedStudyInsights])

  useEffect(() => {
    setHasActiveStudy(studies.some(s => s.status === "active"))
  }, [studies])

  useEffect(() => {
    setCameras(cameraProp)
  }, [cameraProp])

  useEffect(() => {
    if (isDemo) { setInsightsViewed(false); return }
    // Use the most recently created completed insight to determine viewed state
    const latestCreatedAt = allCompletedZoneInsights
      .map(c => c.insights.created_at)
      .sort()
      .at(-1)
    if (!latestCreatedAt) return
    const viewedAt = localStorage.getItem("behappier_insights_viewed_at")
    setInsightsViewed(!!viewedAt && new Date(viewedAt) >= new Date(latestCreatedAt))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, allCompletedZoneInsights.map(c => c.insights.created_at).join(",")])

  useEffect(() => {
    function handleCleared() { setInsightsViewed(true) }
    window.addEventListener("behappier:insights-cleared", handleCleared)
    return () => window.removeEventListener("behappier:insights-cleared", handleCleared)
  }, [])

  useEffect(() => {
    if (!isEnlarged) return
    const el = detectionPanelRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setDetectionPanelHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isEnlarged])

  // Build study_id → zoneId map and subscribe to all active studies' detections
  const studiesKey = allActiveStudies.map(s => s.study_id).sort().join(",")
  useEffect(() => {
    setZoneOccupancies({})
    if (allActiveStudies.length === 0 || tracksOccupancy === false) return

    // Build lookup: study_id → monitoredZoneId
    const studyToZone: Record<string, string> = {}
    for (const s of allActiveStudies) {
      if (s.monitoredZoneId) studyToZone[s.study_id] = s.monitoredZoneId
    }

    if (demoDetectionsPerStudy && Object.keys(demoDetectionsPerStudy).length > 0) {
      const newOcc: Record<string, number> = {}
      for (const s of allActiveStudies) {
        if (!s.monitoredZoneId) continue
        const detections = demoDetectionsPerStudy[s.study_id]
        if (!detections?.length) continue
        const last = detections[detections.length - 1]
        const behaviors = Array.isArray(last?.detected_behaviors) ? last.detected_behaviors : []
        const occ = (behaviors as { name: string; value: number | string }[])
          .find(beh => beh.name.toLowerCase().includes("occupancy"))
        if (occ != null) newOcc[s.monitoredZoneId] = Number(occ.value)
      }
      if (Object.keys(newOcc).length > 0) setZoneOccupancies(newOcc)
      return
    }

    if (demoDetections) {
      const last = demoDetections[demoDetections.length - 1]
      const b = (Array.isArray(last?.detected_behaviors) ? last.detected_behaviors : [])
        .find((beh: { name: string }) => beh.name.toLowerCase().includes("occupancy"))
      const count = b ? Number((b as { value: number | string }).value) : null
      // Apply to the first active study's zone
      const firstZone = allActiveStudies[0]?.monitoredZoneId
      if (firstZone && count != null) setZoneOccupancies({ [firstZone]: count })
      return
    }

    const supabase = createClient()

    async function loadLatest() {
      for (const [studyId, zoneId] of Object.entries(studyToZone)) {
        const { data } = await supabase
          .from("BE_behavior_detections")
          .select("detected_behaviors")
          .eq("study_id", studyId)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single()
        if (data) {
          const behaviors = Array.isArray(data.detected_behaviors) ? data.detected_behaviors : []
          const occ = (behaviors as { name: string; value: number | string }[])
            .find(beh => beh.name.toLowerCase().includes("occupancy"))
          if (occ != null) setZoneOccupancies(prev => ({ ...prev, [zoneId]: Number(occ.value) }))
        }
      }
    }
    loadLatest()

    // Single channel handles all studies — filter client-side
    const channel = supabase
      .channel("heatmap-occ-multi")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "BE_behavior_detections",
      }, (payload) => {
        const studyId = (payload.new as { study_id?: string }).study_id
        if (!studyId) return
        const zoneId = studyToZone[studyId]
        if (!zoneId) return
        const behaviors = Array.isArray(payload.new.detected_behaviors) ? payload.new.detected_behaviors : []
        const occ = (behaviors as { name: string; value: number | string }[])
          .find(beh => beh.name.toLowerCase().includes("occupancy"))
        if (occ != null) setZoneOccupancies(prev => ({ ...prev, [zoneId]: Number(occ.value) }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studiesKey, tracksOccupancy, demoDetections, demoDetectionsPerStudy])

  const zonesWithOccupancy = getZonesWithOccupancy(zones)
  const gridResolution = space?.grid_resolution || 8

  // Use actual zone extents so zones beyond gridResolution aren't clipped
  const effectiveCols = zones.length > 0
    ? Math.max(gridResolution, ...zones.map(z => z.grid_x + z.grid_width))
    : gridResolution
  // Mirror zone-grid.tsx exactly: rowsMin is zone extents only (not clamped to gridResolution)
  // so that a wide floor plan (e.g. AR=2) doesn't get overridden to square by gridResolution
  const effectiveRowsMin = zones.length > 0
    ? Math.max(1, ...zones.map(z => z.grid_y + z.grid_height))
    : 1
  const effectiveRows = imgAspectRatio
    ? Math.max(Math.round(effectiveCols / imgAspectRatio), effectiveRowsMin)
    : Math.max(effectiveCols, effectiveRowsMin)
  const cellPctX = 100 / effectiveCols
  const cellPctY = 100 / effectiveRows

  // Small residual letterbox offset (nearly zero once effectiveRows matches imgAR)
  const containerAR = effectiveCols / effectiveRows
  const [imgOffsetXFrac, imgOffsetYFrac] = useMemo(() => {
    if (!imgAspectRatio) return [0, 0]
    if (containerAR > imgAspectRatio) {
      return [(1 - imgAspectRatio / containerAR) / 2, 0]
    }
    return [0, (1 - containerAR / imgAspectRatio) / 2]
  }, [imgAspectRatio, containerAR])

  // Zone IDs with unviewed completed insights
  const completedInsightZoneIds = insightsViewed
    ? new Set<string>()
    : new Set(allCompletedZoneInsights.map(c => c.zoneId))

  if (zones.length === 0) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Space Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure your space to see occupancy heatmap
            </p>
            <Link href="/dashboard/space">
              <Button size="sm">Set Up Space</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleZoneClick = (zone: ZoneWithOccupancy) => {
    // In EXPE showcase mode, open the zone detail TV view — but only when the zone
    // has no pending completed insights to show (those still use the insight popup).
    if (localStorage.getItem("behappier_showcase_mode") === "true" && space?.id === EXPE_SPACE_ID) {
      const hasPendingInsight = allCompletedZoneInsights.some(c => c.zoneId === zone.id) && !insightsViewed
      if (!hasPendingInsight) {
        setSelectedZone(zone)
        return
      }
    }
    // Check if this zone has a completed insight
    const zoneInsight = allCompletedZoneInsights.find(c => c.zoneId === zone.id)
    if (zoneInsight && !insightsViewed) {
      const toArr = (v: unknown): string[] => Array.isArray(v) ? (v as string[]) : (v ? [String(v)] : [])
      setSelectedBEInsight({
        zoneName: zone.name,
        insights: toArr(zoneInsight.insights.insights),
        recommendations: toArr(zoneInsight.insights.recommendations),
        summary: zoneInsight.insights.dashboard_summary,
      })
      return
    }
    // Legacy frontend Insight
    const insight = getZoneInsight(zone.id, insights)
    if (insight) setSelectedInsight(insight)
  }

  // Any zone has unviewed completed insights and no live data is running
  const hasAnyCompletedInsights = completedInsightZoneIds.size > 0 && !livePreviewMetrics

  // Any running study active
  const hasAnyRunningStudy = allActiveStudies.length > 0 && !livePreviewMetrics

  // Extract grid+legend JSX for reuse in card and enlarge dialog
  const renderGrid = (enlarged: boolean) => (
    <div>
      {/* Legend */}
      <div className={cn("flex items-center gap-4 mb-2 flex-wrap font-medium", enlarged ? "text-xl" : "text-sm")}>
        {livePreviewMetrics ? (
          <>
            <span className="text-foreground">Occupancy:</span>
            <div className="flex items-center gap-1"><div className={cn("rounded", enlarged ? "w-4 h-4" : "w-3 h-3")} style={{ backgroundColor: "rgba(34, 197, 94, 0.5)" }} /><span>Low</span></div>
            <div className="flex items-center gap-1"><div className={cn("rounded border border-yellow-400", enlarged ? "w-4 h-4" : "w-3 h-3")} style={{ backgroundColor: "rgba(234, 179, 8, 0.45)" }} /><span>Medium</span></div>
            <div className="flex items-center gap-1"><div className={cn("rounded border border-red-400", enlarged ? "w-4 h-4" : "w-3 h-3")} style={{ backgroundColor: "rgba(239, 68, 68, 0.45)" }} /><span>High</span></div>
          </>
        ) : (
          <>
            <span className="text-foreground">Status:</span>
            <div className="flex items-center gap-1"><div className={cn("rounded", enlarged ? "w-4 h-4" : "w-3 h-3")} style={{ backgroundColor: "rgba(34, 197, 94, 0.5)" }} /><span>Configured</span></div>
            <div className="flex items-center gap-1"><div className={cn("rounded border border-yellow-400", enlarged ? "w-4 h-4" : "w-3 h-3")} style={{ backgroundColor: "rgba(234, 179, 8, 0.45)" }} /><span>Active Study</span></div>
          </>
        )}
      </div>

      {/* Grid */}
      <div
        className="relative rounded-lg overflow-hidden border border-border mx-auto"
        style={enlarged
          ? { width: `min(55vw, calc((88vh - 100px) * ${(effectiveCols / effectiveRows).toFixed(6)}))`, aspectRatio: `${effectiveCols} / ${effectiveRows}` }
          : { width: gridResolution <= 20 ? "80%" : "100%", aspectRatio: `${effectiveCols} / ${effectiveRows}` }}
      >
        {floorPlanUrl ? (
          <img
            ref={!enlarged ? floorPlanImgRef : undefined}
            src={floorPlanUrl}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain opacity-80 dark:opacity-50"
            style={{ pointerEvents: "none" }}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary/20" />
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100,100,100,${floorPlanUrl ? "0.15" : "0.25"}) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100,100,100,${floorPlanUrl ? "0.15" : "0.25"}) 1px, transparent 1px)
            `,
            backgroundSize: `${cellPctX}% ${cellPctY}%`,
            backgroundPosition: `${imgOffsetXFrac * 100}% ${imgOffsetYFrac * 100}%`,
          }}
        />

        {zonesWithOccupancy.map((zone) => {
          const legacyInsight = getZoneInsight(zone.id, insights)
          const isBEInsightZone = completedInsightZoneIds.has(zone.id)
          const isActiveStudyZone = hasAnyRunningStudy && allActiveStudies.some(s => s.monitoredZoneId === zone.id)
          const hasAnyInsight = !!legacyInsight || isBEInsightZone

          const liveOccupancy = livePreviewMetrics
            ? getLiveOccupancy(zone.name, zone.id, livePreviewMetrics.metrics)
            : null

          // Count: prefer per-zone preview metrics, fall back to per-zone detection-based count
          const liveCountFromPreview = livePreviewMetrics ? getLiveCount(zone.name, zone.id, livePreviewMetrics.metrics) : null
          const liveCount = liveCountFromPreview ?? (isActiveStudyZone ? (zoneOccupancies[zone.id] ?? null) : null)

          const bgColor = liveOccupancy !== null
            ? getLiveHeatmapColor(liveOccupancy)
            : (isActiveStudyZone ? "rgba(234, 179, 8, 0.35)" : getHeatmapColor(hasAnyInsight))

          const borderColor = liveOccupancy !== null
            ? (liveOccupancy >= 80 ? "rgba(239,68,68,0.8)" : liveOccupancy >= 50 ? "rgba(234,179,8,0.8)" : "rgba(34,197,94,0.4)")
            : (hasAnyInsight || isActiveStudyZone ? "rgba(234,179,8,0.8)" : "rgba(34,197,94,0.4)")

          return (
            <div
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              className={cn(
                "absolute rounded-md border transition-all",
                "hover:scale-[1.02] hover:shadow-lg hover:z-10",
                hasAnyInsight && !liveOccupancy && "zone-flashing"
              )}
              style={{
                left: `${imgOffsetXFrac * 100 + zone.grid_x * cellPctX}%`,
                top: `${imgOffsetYFrac * 100 + zone.grid_y * cellPctY}%`,
                width: `calc(${zone.grid_width * cellPctX}% - 2px)`,
                height: `calc(${zone.grid_height * cellPctY}% - 2px)`,
                backgroundColor: bgColor,
                borderColor,
                borderWidth: hasAnyInsight || isActiveStudyZone || liveOccupancy !== null ? 2 : 1,
                cursor: hasAnyInsight ? "pointer" : "default",
                boxShadow: (isBEInsightZone || isActiveStudyZone) && !liveOccupancy
                  ? "0 0 18px rgba(234,179,8,0.5), 0 0 36px rgba(234,179,8,0.2)"
                  : undefined,
              }}
            >
              <div className="p-1 h-full flex flex-col justify-between text-white">
                <div className="flex items-center gap-1">
                  <span className={cn("font-medium truncate leading-tight", enlarged ? "text-2xl" : "text-base")} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    {zone.name}
                  </span>
                </div>
                {liveCount !== null && tracksOccupancy !== false && (
                  <div className="flex items-center justify-center flex-1">
                    <div className="relative inline-flex items-center justify-center">
                      <div className={cn("absolute rounded-full bg-white/25 animate-ping", enlarged ? "w-16 h-16" : "w-10 h-10")} />
                      <div className={cn("relative rounded-full bg-white/20 border border-white/60 flex flex-col items-center justify-center shadow-lg gap-0", enlarged ? "w-14 h-14" : "w-9 h-9")}>
                        <Users className={cn("text-white mb-0.5", enlarged ? "h-5 w-5" : "h-3 w-3")} />
                        <span className={cn("font-bold text-white leading-none", enlarged ? "text-xl" : "text-[11px]")}>{liveCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {cameras.map((cam) => {
          // Prefer saved grid-fraction coords (written by zone-grid on drag).
          // Fall back: derive from pixel x/y using the approximate cellSize from the builder formula.
          // This is more accurate than zone-center for cameras that were placed but never saved with fracs.
          let fracX: number
          let fracY: number
          if (cam.fracX !== undefined && cam.fracY !== undefined) {
            fracX = cam.fracX
            fracY = cam.fracY
          } else if (cam.x > 0 || cam.y > 0) {
            const approxCellSize = Math.max(30, Math.min(60, 480 / gridResolution))
            fracX = Math.max(0, Math.min(1, cam.x / (effectiveCols * approxCellSize)))
            fracY = Math.max(0, Math.min(1, cam.y / (effectiveRows * approxCellSize)))
          } else {
            const zone = zones.find(z => z.id === cam.zoneId)
            fracX = zone ? (zone.grid_x + zone.grid_width / 2) / effectiveCols : 0.5
            fracY = zone ? (zone.grid_y + zone.grid_height / 2) / effectiveRows : 0.5
          }
          return (
            <div
              key={cam.id}
              className="absolute pointer-events-none"
              style={{
                left: `${(imgOffsetXFrac + fracX) * 100}%`,
                top: `${(imgOffsetYFrac + fracY) * 100}%`,
                zIndex: 20, transform: "translate(-50%, -50%)"
              }}
            >
              <CameraMapIcon direction={cam.direction} size={enlarged ? 36 : 26} label={cam.label} showLabel={false} />
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pt-1.5 pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-medium">Occupancy Map</CardTitle>
            {hasAnyRunningStudy && allActiveStudies.some(s => s.status === "running" || s.status === "analyzing") && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
                {allActiveStudies.length > 1 ? `Live ×${allActiveStudies.length}` : "Live"}
              </Badge>
            )}
            {livePreviewMetrics && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/50 bg-blue-500/10">
                Live Preview
              </Badge>
            )}
            {hasAnyCompletedInsights && (
              <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/50 bg-yellow-500/10">
                Insights Ready
              </Badge>
            )}
            {!hasAnyRunningStudy && !livePreviewMetrics && !hasAnyCompletedInsights && hasActiveStudy && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-500/50 bg-green-500/10">
                Active Study
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setIsEnlarged(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            Enlarge
          </Button>
        </CardHeader>

        <CardContent>
          {renderGrid(false)}
        </CardContent>
      </Card>

      {/* Enlarge Dialog */}
      <Dialog open={isEnlarged} onOpenChange={(open) => !open && setIsEnlarged(false)}>
        <DialogContent className="sm:max-w-[92vw] w-[92vw] h-[88vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col h-full p-4">
            <DialogHeader className="shrink-0 pb-3">
              <DialogTitle className="text-5xl font-medium">Occupancy Map</DialogTitle>
              <DialogDescription className="sr-only">Enlarged heatmap view</DialogDescription>
            </DialogHeader>
            <div className={cn("flex-1 min-h-0 flex flex-row gap-6 overflow-hidden", allActiveStudies.length === 0 && "justify-center")}>
              {/* Left: square grid */}
              <div className="shrink-0">
                {renderGrid(true)}
              </div>
              {/* Right: study detections (only when a study is running) */}
              {allActiveStudies.length > 0 && (
                <div ref={detectionPanelRef} className="flex-1 min-w-0 border-l border-border pl-6 overflow-hidden flex flex-col">
                  {allActiveStudies.map((s, idx) => {
                    const rowHeight = detectionPanelHeight > 0 ? Math.floor(detectionPanelHeight / allActiveStudies.length) : 0
                    return (
                    <div
                      key={s.study_id}
                      style={rowHeight > 0
                        ? { height: rowHeight, maxHeight: rowHeight, overflow: "hidden", flexShrink: 0 }
                        : { flex: "1 1 0", minHeight: 0, overflow: "hidden" }}
                      className={cn("flex flex-col", idx > 0 && "border-t border-border pt-3")}
                    >
                      {allActiveStudies.length > 1 && (
                        <p className="text-xs font-mono text-muted-foreground mb-1 truncate shrink-0">{s.study_name ?? s.study_id}</p>
                      )}
                      <p className="text-xl font-medium text-muted-foreground uppercase tracking-wide mb-2 shrink-0">Latest Detection</p>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <LiveDetectionFeed
                          studyId={s.study_id}
                          status={s.status}
                          limit={1}
                          demoDetections={demoDetections}
                          large
                          studyCount={allActiveStudies.length}
                        />
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legacy Insight dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="shrink-0 px-6 pt-6 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-full", selectedInsight?.severity === "critical" ? "bg-destructive/20" : "bg-warning/20")}>
                <AlertTriangle className={cn("h-4 w-4", selectedInsight?.severity === "critical" ? "text-destructive" : "text-warning")} />
              </div>
              <Badge variant={selectedInsight?.severity === "critical" ? "destructive" : "outline"} className="text-xs">
                {selectedInsight?.severity?.toUpperCase()}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-semibold">{selectedInsight?.title}</DialogTitle>
            <DialogDescription className="sr-only">Zone insight details</DialogDescription>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-3 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{selectedInsight?.description}</p>
            {selectedInsight?.action_items && selectedInsight.action_items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recommended Actions:</p>
                <ul className="space-y-1.5">
                  {selectedInsight.action_items.slice(0, 2).map((action) => (
                    <li key={action.id} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{action.title}</span>
                    </li>
                  ))}
                  {selectedInsight.action_items.length > 2 && (
                    <li className="text-xs text-muted-foreground pl-3.5">+{selectedInsight.action_items.length - 2} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className="shrink-0 px-6 pb-5 pt-3 flex justify-end border-t border-border">
            <Button variant="default" size="sm" className="gap-2" onClick={async () => {
              if (localStorage.getItem("behappier_showcase_mode") === "true") {
                try { await document.documentElement.requestFullscreen() } catch {}
              }
              router.push("/dashboard/insights")
            }}>Read More<ArrowRight className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone detail TV view — EXPE showcase mode only */}
      <ZoneDetailDialog
        zone={selectedZone}
        onClose={() => setSelectedZone(null)}
        activeStudies={allActiveStudies}
        mapGeometry={{
          floorPlanUrl: floorPlanUrl ?? null,
          effectiveCols,
          effectiveRows,
          imgOffsetXFrac,
          imgOffsetYFrac,
          imgAspectRatio,
          spaceId: space?.id ?? null,
        }}
      />

      {/* BE Insight dialog (from completed study) */}
      <Dialog open={!!selectedBEInsight} onOpenChange={(open) => !open && setSelectedBEInsight(null)}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="shrink-0 px-6 pt-6 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-full bg-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Study Complete</Badge>
            </div>
            <DialogTitle className="text-lg font-semibold">
              {selectedBEInsight?.zoneName} — Insights
            </DialogTitle>
            <DialogDescription className="sr-only">Completed study zone insights</DialogDescription>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-3 space-y-3">
            {selectedBEInsight?.summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedBEInsight.summary}</p>
            )}
            {selectedBEInsight?.insights && selectedBEInsight.insights.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Key Findings:</p>
                <ul className="space-y-1.5">
                  {selectedBEInsight.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedBEInsight?.recommendations && selectedBEInsight.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
                <ul className="space-y-1.5">
                  {selectedBEInsight.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="shrink-0 px-6 pb-5 pt-3 flex justify-end border-t border-border">
            <Button variant="default" size="sm" className="gap-2" onClick={async () => {
              setSelectedBEInsight(null)
              if (localStorage.getItem("behappier_showcase_mode") === "true") {
                try { await document.documentElement.requestFullscreen() } catch {}
              }
              router.push("/dashboard/insights")
            }}>
              View Full Report<ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
