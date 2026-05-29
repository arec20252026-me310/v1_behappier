'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'rgba(239, 68, 68, 0.7)'
    if (percentage >= 70) return 'rgba(249, 115, 22, 0.7)'
    if (percentage >= 50) return 'rgba(234, 179, 8, 0.7)'
    if (percentage >= 25) return 'rgba(34, 197, 94, 0.7)'
    return 'rgba(59, 130, 246, 0.5)'
  }

  const getZoneInsight = (zoneId: string) => {
    return insights.find(
      (insight) =>
        !insight.is_acknowledged &&
        (insight.severity === 'critical' || insight.severity === 'warning') &&
        insight.related_zones?.includes(zoneId)
    )
  }

  // Track floor plan AR so the container matches the image shape (mirrors zone-grid.tsx)
  const [imgAspectRatio, setImgAspectRatio] = useState<number | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = imgRef.current
    if (!img || !floorPlanUrl) { setImgAspectRatio(null); return }
    const apply = (el: HTMLImageElement) => {
      if (el.naturalWidth && el.naturalHeight) setImgAspectRatio(el.naturalWidth / el.naturalHeight)
    }
    if (img.complete) apply(img)
    else img.addEventListener('load', () => apply(img), { once: true })
  }, [floorPlanUrl])

  const effectiveCols = zones.length > 0
    ? Math.max(gridResolution, ...zones.map(z => z.grid_x + z.grid_width))
    : gridResolution
  const effectiveRowsMin = zones.length > 0
    ? Math.max(1, ...zones.map(z => z.grid_y + z.grid_height))
    : 1
  const effectiveRows = imgAspectRatio
    ? Math.max(Math.round(effectiveCols / imgAspectRatio), effectiveRowsMin)
    : Math.max(effectiveCols, effectiveRowsMin)

  const cellPctX = 100 / effectiveCols
  const cellPctY = 100 / effectiveRows

  const containerAR = effectiveCols / effectiveRows
  const [imgOffsetXFrac, imgOffsetYFrac] = useMemo(() => {
    if (!imgAspectRatio) return [0, 0]
    if (containerAR > imgAspectRatio) return [(1 - imgAspectRatio / containerAR) / 2, 0]
    return [0, (1 - containerAR / imgAspectRatio) / 2]
  }, [imgAspectRatio, containerAR])

  return (
    <div
      className={cn(
        'relative w-full rounded-lg overflow-hidden border border-border',
        floorPlanUrl ? 'bg-muted/30' : 'bg-muted/50',
        className
      )}
      style={{ aspectRatio: `${effectiveCols} / ${effectiveRows}` }}
    >
      {floorPlanUrl && (
        <img
          ref={imgRef}
          src={floorPlanUrl}
          alt="Floor plan"
          className="absolute inset-0 w-full h-full object-contain opacity-80 dark:opacity-50"
          crossOrigin="anonymous"
        />
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(100, 100, 100, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(100, 100, 100, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: `${cellPctX}% ${cellPctY}%`,
          backgroundPosition: `${imgOffsetXFrac * 100}% ${imgOffsetYFrac * 100}%`,
        }}
      />

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
              left: `${imgOffsetXFrac * 100 + zone.grid_x * cellPctX}%`,
              top: `${imgOffsetYFrac * 100 + zone.grid_y * cellPctY}%`,
              width: `${zone.grid_width * cellPctX}%`,
              height: `${zone.grid_height * cellPctY}%`,
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-1 overflow-hidden">
              <span
                className="text-[10px] sm:text-xs font-semibold text-white text-center leading-tight truncate w-full"
                style={{ textShadow: '-1px -1px 0 rgba(0,0,0,0.7), 1px -1px 0 rgba(0,0,0,0.7), -1px 1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.8)' }}
              >
                {zone.name}
              </span>
              {showOccupancy && (
                <span
                  className="text-[9px] sm:text-[10px] text-white/90"
                  style={{ textShadow: '-1px -1px 0 rgba(0,0,0,0.7), 1px -1px 0 rgba(0,0,0,0.7), -1px 1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7)' }}
                >
                  {occupancyPercent}%
                </span>
              )}
            </div>

            {hasInsight && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 shadow-lg">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            )}

            {mode === 'edit' && isSelected && (
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-primary cursor-se-resize rounded-tl"
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )
      })}

      {!floorPlanUrl && zones.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">No floor plan uploaded</span>
        </div>
      )}
    </div>
  )
}
