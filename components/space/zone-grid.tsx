"use client"

import { useRef, useState, useCallback } from "react"
import type { Zone } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ZoneGridProps {
  zones: Zone[]
  selectedZone: Zone | null
  onSelectZone: (zone: Zone | null) => void
  onUpdateZone: (zone: Zone) => void
  floorPlanUrl?: string | null
  gridResolution?: number
}

const DEFAULT_GRID_SIZE = 8
const BASE_CELL_SIZE = 60

export function ZoneGrid({ 
  zones, 
  selectedZone, 
  onSelectZone, 
  onUpdateZone,
  floorPlanUrl,
  gridResolution = DEFAULT_GRID_SIZE,
}: ZoneGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 })

  // Use the provided grid resolution or calculate from zones
  const gridSize = Math.max(
    gridResolution,
    ...zones.map(z => z.grid_x + z.grid_width),
    ...zones.map(z => z.grid_y + z.grid_height)
  )

  // Calculate cell size based on grid resolution - smaller cells for higher resolution
  const cellSize = Math.max(30, Math.min(60, 480 / gridSize))

  const handleMouseDown = useCallback((e: React.MouseEvent, zone: Zone) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(zone.id)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelectZone(zone)
  }, [onSelectZone])

  const handleResizeStart = useCallback((e: React.MouseEvent, zone: Zone) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(zone.id)
    setDragStart({ x: e.clientX, y: e.clientY })
    setResizeStart({ width: zone.grid_width, height: zone.grid_height })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return

    if (dragging) {
      const zone = zones.find(z => z.id === dragging)
      if (!zone) return

      const deltaX = Math.round((e.clientX - dragStart.x) / cellSize)
      const deltaY = Math.round((e.clientY - dragStart.y) / cellSize)

      if (deltaX !== 0 || deltaY !== 0) {
        const newX = Math.max(0, Math.min(gridSize - zone.grid_width, zone.grid_x + deltaX))
        const newY = Math.max(0, Math.min(gridSize - zone.grid_height, zone.grid_y + deltaY))

        if (newX !== zone.grid_x || newY !== zone.grid_y) {
          onUpdateZone({ ...zone, grid_x: newX, grid_y: newY })
          setDragStart({ x: e.clientX, y: e.clientY })
        }
      }
    }

    if (resizing) {
      const zone = zones.find(z => z.id === resizing)
      if (!zone) return

      const deltaX = Math.round((e.clientX - dragStart.x) / cellSize)
      const deltaY = Math.round((e.clientY - dragStart.y) / cellSize)

      const newWidth = Math.max(1, Math.min(gridSize - zone.grid_x, resizeStart.width + deltaX))
      const newHeight = Math.max(1, Math.min(gridSize - zone.grid_y, resizeStart.height + deltaY))

      if (newWidth !== zone.grid_width || newHeight !== zone.grid_height) {
        onUpdateZone({ ...zone, grid_width: newWidth, grid_height: newHeight })
      }
    }
  }, [dragging, resizing, dragStart, resizeStart, zones, onUpdateZone, gridSize, cellSize])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  const gridWidth = gridSize * cellSize
  const gridHeight = gridSize * cellSize

  return (
    <div className="overflow-auto max-h-[600px] rounded-lg border border-border">
      <div
        ref={gridRef}
        className="relative"
        style={{
          width: gridWidth,
          height: gridHeight,
          minWidth: DEFAULT_GRID_SIZE * 40,
          minHeight: DEFAULT_GRID_SIZE * 40,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
          <div className="absolute inset-0 bg-secondary/30" />
        )}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 100, 100, ${floorPlanUrl ? '0.2' : '0.3'}) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 100, 100, ${floorPlanUrl ? '0.2' : '0.3'}) 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize}px ${cellSize}px`,
          }}
        />

        {/* Grid labels - columns */}
        <div className="absolute top-0 left-0 right-0 flex pointer-events-none" style={{ height: 16 }}>
          {Array.from({ length: Math.min(gridSize, 26) }).map((_, i) => (
            <div
              key={i}
              className="text-[9px] text-muted-foreground/60 text-center"
              style={{ width: cellSize }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>

        {/* Grid labels - rows */}
        <div className="absolute top-0 left-0 bottom-0 flex flex-col pointer-events-none" style={{ width: 16 }}>
          {Array.from({ length: gridSize }).map((_, i) => (
            <div
              key={i}
              className="text-[9px] text-muted-foreground/60 flex items-center justify-center"
              style={{ height: cellSize, width: 16 }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Zones */}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={cn(
              "absolute rounded-md border-2 cursor-move transition-shadow",
              selectedZone?.id === zone.id
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg z-10"
                : "hover:shadow-md",
              dragging === zone.id && "opacity-80",
              resizing === zone.id && "opacity-80"
            )}
            style={{
              left: zone.grid_x * cellSize,
              top: zone.grid_y * cellSize,
              width: zone.grid_width * cellSize - 2,
              height: zone.grid_height * cellSize - 2,
              backgroundColor: `${zone.color}66`,
              borderColor: zone.color,
            }}
            onMouseDown={(e) => handleMouseDown(e, zone)}
            onClick={() => onSelectZone(zone)}
          >
            <div className="p-1 h-full flex flex-col overflow-hidden">
              <span
                className="text-[10px] font-medium truncate leading-tight"
                style={{ 
                  color: zone.color,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                {zone.name}
              </span>
              {zone.zone_type && zone.grid_height > 1 && (
                <span className="text-[8px] text-muted-foreground capitalize truncate">
                  {zone.zone_type.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Resize handle */}
            {selectedZone?.id === zone.id && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary rounded-tl-sm"
                onMouseDown={(e) => handleResizeStart(e, zone)}
                style={{ opacity: 0.8 }}
              />
            )}
          </div>
        ))}

        {/* Empty state */}
        {zones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground bg-background/80 px-4 py-2 rounded-md">
              Click &quot;Add Zone&quot; to start building your space
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
