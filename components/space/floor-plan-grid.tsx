'use client'

import { type Zone, type Insight } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface ZoneWithOccupancy extends Zone {
  occupancy_percentage?: number
  current_occupancy?: number
}

interface FloorPlanGridProps {
  floorPlanUrl?: string | null
  zones: ZoneWithOccupancy[]
  gridResolution?: number
  selectedZoneId?: string | null
  insights?: Insight[]
  mode?: 'view' | 'edit'
  showOccupancy?: boolean
  onZoneClick?: (zone: ZoneWithOccupancy) => void
  onZoneSelect?: (zoneId: string | null) => void
  onZoneDrag?: (zoneId: string, x: number, y: number) => void
  onZoneResize?: (zoneId: string, width: number, height: number) => void
  className?: string
}

export function FloorPlanGrid({
  floorPlanUrl,
  zones,
  gridResolution = 8,
  selectedZoneId,
  insights = [],
  mode = 'view',
  showOccupancy = false,
  onZoneClick,
  onZoneSelect,
  onZoneDrag,
  onZoneResize,
  className,
}: FloorPlanGridProps) {
  // Get occupancy color based on percentage
  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'rgba(239, 68, 68, 0.7)' // red
    if (percentage >= 70) return 'rgba(249, 115, 22, 0.7)' // orange
    if (percentage >= 50) return 'rgba(234, 179, 8, 0.7)' // yellow
    if (percentage >= 25) return 'rgba(34, 197, 94, 0.7)' // green
    return 'rgba(59, 130, 246, 0.5)' // blue (low/empty)
  }

  // Check if a zone has an active (unacknowledged) insight
  const getZoneInsight = (zoneId: string) => {
    return insights.find(
      (insight) =>
        !insight.is_acknowledged &&
        (insight.severity === 'critical' || insight.severity === 'warning') &&
        insight.related_zones?.includes(zoneId)
    )
  }

  const cellSize = 100 / gridResolution

  return (
    <div
      className={cn(
        'relative w-full aspect-square rounded-lg overflow-hidden border border-border',
        floorPlanUrl ? 'bg-muted/30' : 'bg-muted/50',
        className
      )}
    >
      {/* Floor plan background image */}
      {floorPlanUrl && (
        <img
          src={floorPlanUrl}
          alt="Floor plan"
          className="absolute inset-0 w-full h-full object-contain opacity-60"
          crossOrigin="anonymous"
        />
      )}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(100, 100, 100, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(100, 100, 100, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}% ${cellSize}%`,
        }}
      />

      {/* Zones */}
      {zones.map((zone) => {
        const hasInsight = getZoneInsight(zone.id)
        const occupancyPercent = zone.occupancy_percentage ?? 0
        const isSelected = selectedZoneId === zone.id

        return (
          <div
            key={zone.id}
            className={cn(
              'absolute transition-all duration-200',
              mode === 'edit' && 'cursor-move',
              mode === 'view' && onZoneClick && 'cursor-pointer',
              isSelected && 'ring-2 ring-primary ring-offset-1',
              hasInsight && 'zone-flashing'
            )}
            style={{
              left: `${zone.grid_x * cellSize}%`,
              top: `${zone.grid_y * cellSize}%`,
              width: `${zone.grid_width * cellSize}%`,
              height: `${zone.grid_height * cellSize}%`,
              backgroundColor: showOccupancy
                ? getOccupancyColor(occupancyPercent)
                : `${zone.color}99`,
              borderRadius: '4px',
              border: hasInsight
                ? '2px solid rgba(239, 68, 68, 1)'
                : isSelected
                  ? '2px solid var(--primary)'
                  : '1px solid rgba(255, 255, 255, 0.3)',
            }}
            onClick={() => {
              if (mode === 'view' && onZoneClick) {
                onZoneClick(zone)
              } else if (mode === 'edit' && onZoneSelect) {
                onZoneSelect(zone.id)
              }
            }}
          >
            {/* Zone label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-1 overflow-hidden">
              <span
                className="text-[10px] sm:text-xs font-medium text-white drop-shadow-md text-center leading-tight truncate w-full"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {zone.name}
              </span>
              {showOccupancy && (
                <span
                  className="text-[9px] sm:text-[10px] text-white/90 drop-shadow-md"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {occupancyPercent}%
                </span>
              )}
            </div>

            {/* Insight alert icon */}
            {hasInsight && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 shadow-lg">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Resize handle (edit mode only) */}
            {mode === 'edit' && isSelected && (
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-primary cursor-se-resize rounded-tl"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  // Resize logic would be handled by parent
                }}
              />
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {!floorPlanUrl && zones.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">No floor plan uploaded</span>
        </div>
      )}
    </div>
  )
}
