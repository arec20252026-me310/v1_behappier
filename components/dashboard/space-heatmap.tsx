"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users } from "lucide-react"
import Link from "next/link"
import type { Zone } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ZoneWithOccupancy extends Zone {
  currentOccupancy: number
  occupancyPercentage: number
}

interface SpaceHeatmapProps {
  zones: Zone[]
}

// Convert zones to include occupancy data (starts at 0 until real data flows in)
function getZonesWithOccupancy(zones: Zone[]): ZoneWithOccupancy[] {
  return zones.map((zone) => ({
    ...zone,
    currentOccupancy: 0,
    occupancyPercentage: 0,
  }))
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

const GRID_SIZE = 8
const CELL_SIZE = 50

export function SpaceHeatmap({ zones }: SpaceHeatmapProps) {
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
            {zonesWithOccupancy.map((zone) => (
                <div
                  key={zone.id}
                  className={cn(
                    "absolute rounded-md border transition-all",
                    "hover:scale-[1.02] hover:shadow-lg hover:z-10"
                  )}
                  style={{
                    left: zone.grid_x * CELL_SIZE,
                    top: zone.grid_y * CELL_SIZE,
                    width: zone.grid_width * CELL_SIZE - 4,
                    height: zone.grid_height * CELL_SIZE - 4,
                    backgroundColor: getHeatmapColor(zone.occupancyPercentage),
                    borderColor: "rgba(255,255,255,0.2)",
                    borderWidth: 1,
                  }}
                >
                  <div className={cn("p-1.5 h-full flex flex-col justify-between", getTextColor(zone.occupancyPercentage))}>
                    <span className="text-[10px] font-medium truncate leading-tight">
                      {zone.name}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] opacity-90">
                      <Users className="h-2.5 w-2.5" />
                      <span>{zone.currentOccupancy}</span>
                      <span className="opacity-70">({zone.occupancyPercentage}%)</span>
                    </div>
                  </div>
                </div>
              ))}
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

    </>
  )
}
