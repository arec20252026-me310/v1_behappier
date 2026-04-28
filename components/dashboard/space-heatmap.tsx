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
import { MapPin, AlertTriangle, ArrowRight } from "lucide-react"
import { CameraMapIcon } from "@/components/space/camera-map-icon"
import Link from "next/link"
import type { Zone, Insight, Space, Study, CameraPlacement } from "@/lib/types"
import { cn } from "@/lib/utils"

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
}

// Convert zones to include occupancy data (mock data for now)
function getZonesWithOccupancy(zones: Zone[]): ZoneWithOccupancy[] {
  // Mock occupancy data - Zone 2 has high occupancy to match the insight
  const mockOccupancy: Record<string, { current: number; percentage: number }> = {
    "Zone 1": { current: 8, percentage: 45 },
    "Zone 2": { current: 28, percentage: 92 }, // High occupancy - matches insight
    "Zone 3": { current: 5, percentage: 35 },
    "Zone 4": { current: 12, percentage: 60 },
    "Zone 5": { current: 3, percentage: 20 },
  }

  return zones.map((zone) => {
    const occupancy = mockOccupancy[zone.name] || { current: 0, percentage: 0 }
    return {
      ...zone,
      currentOccupancy: occupancy.current,
      occupancyPercentage: occupancy.percentage,
    }
  })
}

// Two-state color: green = Normal, yellow = Abnormal (has active insight)
function getHeatmapColor(hasInsight: boolean): string {
  return hasInsight
    ? "rgba(234, 179, 8, 0.45)"   // Yellow - Abnormal
    : "rgba(34, 197, 94, 0.35)"   // Green - Normal
}

function getTextColor(hasInsight: boolean): string {
  return hasInsight ? "text-foreground" : "text-foreground"
}

// Check if a zone has an unacknowledged critical/warning insight
function getZoneInsight(zoneId: string, insights: Insight[]): Insight | null {
  return insights.find(
    (insight) =>
      insight.related_zones?.includes(zoneId) &&
      !insight.is_acknowledged &&
      (insight.severity === "critical" || insight.severity === "warning")
  ) || null
}

export function SpaceHeatmap({ zones, insights = [], space, studies = [], cameras: cameraProp = [] }: SpaceHeatmapProps) {
  const [hasActiveStudy, setHasActiveStudy] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [cameras, setCameras] = useState<CameraPlacement[]>(cameraProp)

  useEffect(() => {
    setHasActiveStudy(studies.some(s => s.status === 'active'))
  }, [studies])

  useEffect(() => {
    // Load camera placements from localStorage (set by SpaceEditor)
    try {
      const key = `camera-placements-${space?.id ?? 'default'}`
      const stored = localStorage.getItem(key)
      if (stored) {
        setCameras(JSON.parse(stored))
      }
    } catch {}
  }, [space?.id])
  const zonesWithOccupancy = getZonesWithOccupancy(zones)
  
  const gridResolution = space?.grid_resolution || 8
  const floorPlanUrl = space?.floor_plan_url
  
  // Calculate cell size based on grid resolution - fit within 400px
  const CONTAINER_SIZE = 500
  const CELL_SIZE = Math.floor(CONTAINER_SIZE / gridResolution)

  if (zones.length === 0) {
    return (
      <Card className="bg-card border-border">
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
    const insight = getZoneInsight(zone.id, insights)
    if (insight) {
      setSelectedInsight(insight)
    }
  }

  const gridWidth = gridResolution * CELL_SIZE
  const gridHeight = gridResolution * CELL_SIZE

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Occupancy Heatmap</CardTitle>
            {hasActiveStudy && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-500/50 bg-green-500/10">
                Active Study
              </Badge>
            )}
          </div>
          <Link href="/dashboard/space">
            <Button variant="ghost" size="sm" className="text-xs">
              Edit Space
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34, 197, 94, 0.5)" }} />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border border-yellow-400" style={{ backgroundColor: "rgba(234, 179, 8, 0.45)" }} />
              <span>Abnormal</span>
            </div>
          </div>

          {/* Heatmap Grid with Floor Plan */}
          <div
            className="relative rounded-lg overflow-hidden mx-auto border border-border"
            style={{
              width: gridWidth,
              height: gridHeight,
            }}
          >
            {/* Floor plan background */}
            {floorPlanUrl ? (
              <img
                src={floorPlanUrl}
                alt="Floor plan"
                className="absolute inset-0 w-full h-full object-contain opacity-50"
                style={{ pointerEvents: 'none' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="absolute inset-0 bg-secondary/20" />
            )}

            {/* Grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(100, 100, 100, ${floorPlanUrl ? '0.15' : '0.25'}) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(100, 100, 100, ${floorPlanUrl ? '0.15' : '0.25'}) 1px, transparent 1px)
                `,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              }}
            />

            {/* Zones with heatmap colors */}
            {zonesWithOccupancy.map((zone) => {
              const zoneInsight = getZoneInsight(zone.id, insights)
              const hasInsight = !!zoneInsight
              
              return (
                <div
                  key={zone.id}
                  onClick={() => handleZoneClick(zone)}
                  className={cn(
                    "absolute rounded-md border transition-all",
                    "hover:scale-[1.02] hover:shadow-lg hover:z-10",
                    hasInsight && "zone-flashing"
                  )}
                  style={{
                    left: zone.grid_x * CELL_SIZE,
                    top: zone.grid_y * CELL_SIZE,
                    width: zone.grid_width * CELL_SIZE - 2,
                    height: zone.grid_height * CELL_SIZE - 2,
                    backgroundColor: getHeatmapColor(hasInsight),
                    borderColor: hasInsight ? "rgba(234, 179, 8, 0.8)" : "rgba(34, 197, 94, 0.4)",
                    borderWidth: hasInsight ? 2 : 1,
                    cursor: hasInsight ? "pointer" : "default",
                  }}
                >
                  <div className={cn("p-1 h-full flex flex-col justify-between", getTextColor(hasInsight))}>
                    <div className="flex items-center gap-1">
                      <span 
                        className="text-[10px] font-medium truncate leading-tight"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        {zone.name}
                      </span>
                      {hasInsight && (
                        <AlertTriangle className="h-2.5 w-2.5 text-white animate-pulse shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Camera icons — read-only overlay, positions scaled from builder cell size */}
            {cameras.map((cam) => {
              // Builder uses: cellSize = Math.max(30, Math.min(60, 480 / gridResolution))
              const builderCellSize = Math.max(30, Math.min(60, 480 / gridResolution))
              const scale = CELL_SIZE / builderCellSize
              return (
                <div
                  key={cam.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: cam.x * scale,
                    top: cam.y * scale,
                    zIndex: 20,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <CameraMapIcon
                    direction={cam.direction}
                    size={18}
                    label={cam.label}
                    showLabel={false}
                  />
                </div>
              )
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-4 text-center">
            <div className="p-2 rounded-lg bg-secondary/50 inline-block min-w-[100px]">
              <p className="text-lg font-semibold text-yellow-500">
                {zonesWithOccupancy.filter(z => !!getZoneInsight(z.id, insights)).length}
              </p>
              <p className="text-[10px] text-muted-foreground">Abnormal Zones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insight Modal */}
      <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-full",
                selectedInsight?.severity === "critical" ? "bg-destructive/20" : "bg-warning/20"
              )}>
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  selectedInsight?.severity === "critical" ? "text-destructive" : "text-warning"
                )} />
              </div>
              <Badge 
                variant={selectedInsight?.severity === "critical" ? "destructive" : "outline"}
                className="text-xs"
              >
                {selectedInsight?.severity?.toUpperCase()}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-semibold mt-2">
              {selectedInsight?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {selectedInsight?.description}
            </DialogDescription>
          </DialogHeader>

          {/* Action Items Preview */}
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
                  <li className="text-xs text-muted-foreground pl-3.5">
                    +{selectedInsight.action_items.length - 2} more actions
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Read More Link */}
          <div className="mt-6 flex justify-end">
            <Link href="/dashboard/insights">
              <Button variant="default" size="sm" className="gap-2">
                Read More
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
