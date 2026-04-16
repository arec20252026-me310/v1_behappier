"use client"

import { useState } from "react"
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
import { MapPin, Users, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Zone, Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ZoneWithOccupancy extends Zone {
  currentOccupancy: number
  occupancyPercentage: number
}

interface SpaceHeatmapProps {
  zones: Zone[]
  insights?: Insight[]
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

// Get heatmap color based on occupancy percentage
function getHeatmapColor(percentage: number): string {
  if (percentage >= 85) return "rgba(239, 68, 68, 0.7)" // Red - critical
  if (percentage >= 70) return "rgba(249, 115, 22, 0.6)" // Orange - high
  if (percentage >= 50) return "rgba(234, 179, 8, 0.5)" // Yellow - medium
  if (percentage >= 25) return "rgba(34, 197, 94, 0.4)" // Green - low
  return "rgba(59, 130, 246, 0.3)" // Blue - very low
}

// Get text color based on occupancy
function getTextColor(percentage: number): string {
  if (percentage >= 70) return "text-white"
  return "text-foreground"
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

const GRID_SIZE = 8
const CELL_SIZE = 50

export function SpaceHeatmap({ zones, insights = [] }: SpaceHeatmapProps) {
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const zonesWithOccupancy = getZonesWithOccupancy(zones)

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

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Occupancy Heatmap</CardTitle>
            <Badge variant="outline" className="text-xs">Live</Badge>
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
            <span className="text-muted-foreground">Occupancy:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(59, 130, 246, 0.5)" }} />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(234, 179, 8, 0.6)" }} />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(249, 115, 22, 0.7)" }} />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.8)" }} />
              <span>Critical</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div
            className="relative bg-secondary/20 rounded-lg overflow-hidden mx-auto"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              backgroundImage: `
                linear-gradient(to right, oklch(0.28 0.01 260 / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, oklch(0.28 0.01 260 / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          >
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
                    width: zone.grid_width * CELL_SIZE - 4,
                    height: zone.grid_height * CELL_SIZE - 4,
                    backgroundColor: getHeatmapColor(zone.occupancyPercentage),
                    borderColor: hasInsight ? "rgba(239, 68, 68, 1)" : "rgba(255,255,255,0.2)",
                    borderWidth: hasInsight ? 2 : 1,
                    cursor: hasInsight ? "pointer" : "default",
                  }}
                >
                  <div className={cn("p-1.5 h-full flex flex-col justify-between", getTextColor(zone.occupancyPercentage))}>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium truncate leading-tight">
                        {zone.name}
                      </span>
                      {hasInsight && (
                        <AlertTriangle className="h-2.5 w-2.5 text-white animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] opacity-90">
                      <Users className="h-2.5 w-2.5" />
                      <span>{zone.currentOccupancy}</span>
                      <span className="opacity-70">({zone.occupancyPercentage}%)</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-lg font-semibold text-foreground">
                {zonesWithOccupancy.reduce((sum, z) => sum + z.currentOccupancy, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Total Occupants</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-lg font-semibold text-foreground">
                {Math.round(zonesWithOccupancy.reduce((sum, z) => sum + z.occupancyPercentage, 0) / zonesWithOccupancy.length)}%
              </p>
              <p className="text-[10px] text-muted-foreground">Avg. Utilization</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-lg font-semibold text-warning">
                {zonesWithOccupancy.filter(z => z.occupancyPercentage >= 85).length}
              </p>
              <p className="text-[10px] text-muted-foreground">Critical Zones</p>
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
