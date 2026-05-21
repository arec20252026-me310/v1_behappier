"use client"

import React, { useState, useEffect } from "react"
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
import { MapPin, AlertTriangle, ArrowRight, Maximize2 } from "lucide-react"
import { CameraMapIcon } from "@/components/space/camera-map-icon"
import Link from "next/link"
// Link kept for insight dialogs below
import type { Zone, Insight, Space, Study, CameraPlacement, BELivePreviewMetrics, BEInsightOutput, BEStudy } from "@/lib/types"
import { cn } from "@/lib/utils"
import { LiveDetectionFeed, type DetectionRow } from "@/components/studies/live-detection-feed"

interface ZoneWithOccupancy extends Zone {
  currentOccupancy: number
  occupancyPercentage: number
}

interface SpaceHeatmapProps {
  zones: Zone[]
  insights?: Insight[]
  space?: Space | null
  studies?: Study[]
  cameras?: CameraPlacement[]
  livePreviewMetrics?: BELivePreviewMetrics | null
  completedStudy?: BEStudy | null
  completedStudyInsights?: BEInsightOutput | null
  activeStudyId?: string
  activeStudyStatus?: string
  activeStudyMonitoredZoneId?: string
  demoDetections?: DetectionRow[]
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
  completedStudy = null,
  completedStudyInsights = null,
  activeStudyId,
  activeStudyStatus,
  activeStudyMonitoredZoneId,
  demoDetections,
}: SpaceHeatmapProps) {
  const [hasActiveStudy, setHasActiveStudy] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [selectedBEInsight, setSelectedBEInsight] = useState<BEInsightSelection | null>(null)
  const [cameras, setCameras] = useState<CameraPlacement[]>(cameraProp)
  const [insightsViewed, setInsightsViewed] = useState(false)
  const [isEnlarged, setIsEnlarged] = useState(false)

  useEffect(() => {
    setHasActiveStudy(studies.some(s => s.status === "active"))
  }, [studies])

  useEffect(() => {
    try {
      const key = `camera-placements-${space?.id ?? "default"}`
      const stored = localStorage.getItem(key)
      if (stored) setCameras(JSON.parse(stored))
    } catch {}
  }, [space?.id])

  useEffect(() => {
    const createdAt = completedStudyInsights?.created_at
    if (!createdAt) return
    const viewedAt = localStorage.getItem("behappier_insights_viewed_at")
    setInsightsViewed(!!viewedAt && new Date(viewedAt) >= new Date(createdAt))
  }, [completedStudyInsights?.created_at])

  const zonesWithOccupancy = getZonesWithOccupancy(zones)
  const gridResolution = space?.grid_resolution || 8
  const floorPlanUrl = space?.floor_plan_url
  const cellPct = 100 / gridResolution

  // Zone highlighted by a completed study — real studies use target_zones[0], demo uses monitored_zone_id
  const monitoredZoneId = (
    (completedStudy?.metadata?.monitored_zone_id as string | undefined) ??
    ((completedStudy?.metadata?.target_zones as string[] | undefined)?.[0])
  )

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
    // Completed study insight takes priority
    if (monitoredZoneId === zone.id && completedStudyInsights) {
      const toArr = (v: string | string[]): string[] => Array.isArray(v) ? v : (v ? [v] : [])
      setSelectedBEInsight({
        zoneName: zone.name,
        insights: toArr(completedStudyInsights.insights),
        recommendations: toArr(completedStudyInsights.recommendations),
        summary: completedStudyInsights.dashboard_summary,
      })
      return
    }
    // Legacy frontend Insight
    const insight = getZoneInsight(zone.id, insights)
    if (insight) setSelectedInsight(insight)
  }

  // Is the completed-study mode active (no live monitoring, no running study, not yet viewed)?
  const hasCompletedInsights = !!monitoredZoneId && !!completedStudyInsights && !livePreviewMetrics && !activeStudyId && !insightsViewed

  // Active running study zone highlight
  const isRunningStudy = !!activeStudyId && !hasCompletedInsights && !livePreviewMetrics

  // Extract grid+legend JSX for reuse in card and enlarge dialog
  const gridInner = (
    <>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 text-xs flex-wrap">
        {livePreviewMetrics ? (
          <>
            <span className="text-muted-foreground">Occupancy:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34, 197, 94, 0.5)" }} /><span>Low</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-yellow-400" style={{ backgroundColor: "rgba(234, 179, 8, 0.45)" }} /><span>Medium</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-red-400" style={{ backgroundColor: "rgba(239, 68, 68, 0.45)" }} /><span>High</span></div>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34, 197, 94, 0.5)" }} /><span>Configured</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-yellow-400" style={{ backgroundColor: "rgba(234, 179, 8, 0.45)" }} /><span>Active Study</span></div>
          </>
        )}
      </div>

      {/* Grid */}
      <div
        className="relative rounded-lg overflow-hidden mx-auto border border-border w-full"
        style={{ aspectRatio: "1 / 1" }}
      >
        {floorPlanUrl ? (
          <img
            src={floorPlanUrl}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain opacity-50"
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
            backgroundSize: `${cellPct}% ${cellPct}%`,
          }}
        />

        {zonesWithOccupancy.map((zone) => {
          const legacyInsight = getZoneInsight(zone.id, insights)
          const isBEInsightZone = hasCompletedInsights && zone.id === monitoredZoneId
          const isActiveStudyZone = isRunningStudy && zone.id === activeStudyMonitoredZoneId
          const hasAnyInsight = !!legacyInsight || isBEInsightZone

          const liveOccupancy = livePreviewMetrics
            ? getLiveOccupancy(zone.name, zone.id, livePreviewMetrics.metrics)
            : null

          const liveCount = livePreviewMetrics ? getLiveCount(zone.name, zone.id, livePreviewMetrics.metrics) : null

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
                left: `${zone.grid_x * cellPct}%`,
                top: `${zone.grid_y * cellPct}%`,
                width: `calc(${zone.grid_width * cellPct}% - 2px)`,
                height: `calc(${zone.grid_height * cellPct}% - 2px)`,
                backgroundColor: bgColor,
                borderColor,
                borderWidth: hasAnyInsight || isActiveStudyZone || liveOccupancy !== null ? 2 : 1,
                cursor: hasAnyInsight ? "pointer" : "default",
                boxShadow: (isBEInsightZone || isActiveStudyZone) && !liveOccupancy
                  ? "0 0 18px rgba(234,179,8,0.5), 0 0 36px rgba(234,179,8,0.2)"
                  : undefined,
              }}
            >
              <div className="p-1 h-full flex flex-col justify-between text-foreground">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium truncate leading-tight" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    {zone.name}
                  </span>
                  {hasAnyInsight && !liveOccupancy && (
                    <AlertTriangle className="h-2.5 w-2.5 text-yellow-400 animate-pulse shrink-0" />
                  )}
                </div>
                {liveCount !== null && (
                  <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-lg font-bold text-white leading-none" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                      {liveCount}
                    </span>
                    <span className="text-[8px] text-white/70">occupants</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {cameras.map((cam) => {
          const builderCellSize = Math.max(30, Math.min(60, 480 / gridResolution))
          const totalBuilderSize = builderCellSize * gridResolution
          return (
            <div
              key={cam.id}
              className="absolute pointer-events-none"
              style={{ left: `${(cam.x / totalBuilderSize) * 100}%`, top: `${(cam.y / totalBuilderSize) * 100}%`, zIndex: 20, transform: "translate(-50%, -50%)" }}
            >
              <CameraMapIcon direction={cam.direction} size={18} label={cam.label} showLabel={false} />
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <>
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pt-1.5 pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Occupancy Heatmap</CardTitle>
            {livePreviewMetrics && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/50 bg-blue-500/10">
                Live Preview
              </Badge>
            )}
            {hasCompletedInsights && (
              <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/50 bg-yellow-500/10">
                Insights Ready
              </Badge>
            )}
            {!livePreviewMetrics && !hasCompletedInsights && hasActiveStudy && (
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
          {gridInner}
        </CardContent>
      </Card>

      {/* Enlarge Dialog */}
      <Dialog open={isEnlarged} onOpenChange={(open) => !open && setIsEnlarged(false)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-4 gap-0 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle className="text-base font-medium">Occupancy Heatmap</DialogTitle>
            <DialogDescription className="sr-only">Enlarged heatmap view</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-auto">{gridInner}</div>
            {activeStudyId && (
              <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto border-l border-border pl-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">Latest Detection</p>
                <LiveDetectionFeed
                  studyId={activeStudyId}
                  status={activeStudyStatus ?? "running"}
                  limit={6}
                  demoDetections={demoDetections}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legacy Insight dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-full", selectedInsight?.severity === "critical" ? "bg-destructive/20" : "bg-warning/20")}>
                <AlertTriangle className={cn("h-4 w-4", selectedInsight?.severity === "critical" ? "text-destructive" : "text-warning")} />
              </div>
              <Badge variant={selectedInsight?.severity === "critical" ? "destructive" : "outline"} className="text-xs">
                {selectedInsight?.severity?.toUpperCase()}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-semibold mt-2">{selectedInsight?.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {selectedInsight?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedInsight?.action_items && selectedInsight.action_items.length > 0 && (
            <div className="mt-4 space-y-2">
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
          <div className="mt-6 flex justify-end">
            <Link href="/dashboard/insights">
              <Button variant="default" size="sm" className="gap-2">Read More<ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* BE Insight dialog (from completed study) */}
      <Dialog open={!!selectedBEInsight} onOpenChange={(open) => !open && setSelectedBEInsight(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Study Complete</Badge>
            </div>
            <DialogTitle className="text-lg font-semibold mt-2">
              {selectedBEInsight?.zoneName} — Insights
            </DialogTitle>
            {selectedBEInsight?.summary && (
              <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {selectedBEInsight.summary}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedBEInsight?.insights && selectedBEInsight.insights.length > 0 && (
            <div className="mt-3 space-y-2">
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
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
              <ul className="space-y-1.5">
                {selectedBEInsight.recommendations.slice(0, 2).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Link href="/dashboard/insights">
              <Button variant="default" size="sm" className="gap-2" onClick={() => setSelectedBEInsight(null)}>
                View Full Report<ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
