"use client"

import { useRef, useState, useCallback } from "react"
import type { Zone } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ZoneGridProps {
  zones: Zone[]
  selectedZone: Zone | null
  onSelectZone: (zone: Zone | null) => void
  onUpdateZone: (zone: Zone) => void
}

const DEFAULT_GRID_SIZE = 8
const CELL_SIZE = 60

export function ZoneGrid({ zones, selectedZone, onSelectZone, onUpdateZone }: ZoneGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Calculate dynamic grid size based on zone positions
  const gridSize = Math.max(
    DEFAULT_GRID_SIZE,
    ...zones.map(z => z.grid_x + z.grid_width),
    ...zones.map(z => z.grid_y + z.grid_height)
  )

  const handleMouseDown = useCallback((e: React.MouseEvent, zone: Zone) => {
    e.preventDefault()
    setDragging(zone.id)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelectZone(zone)
  }, [onSelectZone])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !gridRef.current) return

    const zone = zones.find(z => z.id === dragging)
    if (!zone) return

    const deltaX = Math.round((e.clientX - dragStart.x) / CELL_SIZE)
    const deltaY = Math.round((e.clientY - dragStart.y) / CELL_SIZE)

    if (deltaX !== 0 || deltaY !== 0) {
      const newX = Math.max(0, Math.min(gridSize - zone.grid_width, zone.grid_x + deltaX))
      const newY = Math.max(0, Math.min(gridSize - zone.grid_height, zone.grid_y + deltaY))

      if (newX !== zone.grid_x || newY !== zone.grid_y) {
        onUpdateZone({ ...zone, grid_x: newX, grid_y: newY })
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    }
  }, [dragging, dragStart, zones, onUpdateZone, gridSize])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  return (
    <div className="overflow-auto max-h-[600px] rounded-lg border border-border">
    <div
      ref={gridRef}
      className="relative bg-secondary/30"
      style={{
        width: gridSize * CELL_SIZE,
        height: gridSize * CELL_SIZE,
        minWidth: DEFAULT_GRID_SIZE * CELL_SIZE,
        minHeight: DEFAULT_GRID_SIZE * CELL_SIZE,
        backgroundImage: `
          linear-gradient(to right, oklch(0.28 0.01 260 / 0.5) 1px, transparent 1px),
          linear-gradient(to bottom, oklch(0.28 0.01 260 / 0.5) 1px, transparent 1px)
        `,
        backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid labels */}
      <div className="absolute top-0 left-0 right-0 flex pointer-events-none">
        {Array.from({ length: gridSize }).map((_, i) => (
          <div
            key={i}
            className="text-[10px] text-muted-foreground/50 text-center"
            style={{ width: CELL_SIZE }}
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      <div className="absolute top-0 left-0 bottom-0 flex flex-col pointer-events-none">
        {Array.from({ length: gridSize }).map((_, i) => (
          <div
            key={i}
            className="text-[10px] text-muted-foreground/50 flex items-center justify-center"
            style={{ height: CELL_SIZE, width: 16 }}
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
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
              : "hover:shadow-md",
            dragging === zone.id && "opacity-80"
          )}
          style={{
            left: zone.grid_x * CELL_SIZE,
            top: zone.grid_y * CELL_SIZE,
            width: zone.grid_width * CELL_SIZE - 4,
            height: zone.grid_height * CELL_SIZE - 4,
            backgroundColor: `${zone.color}33`,
            borderColor: zone.color,
          }}
          onMouseDown={(e) => handleMouseDown(e, zone)}
          onClick={() => onSelectZone(zone)}
        >
          <div className="p-2 h-full flex flex-col">
            <span
              className="text-xs font-medium truncate"
              style={{ color: zone.color }}
            >
              {zone.name}
            </span>
            {zone.zone_type && (
              <span className="text-[10px] text-muted-foreground capitalize truncate">
                {zone.zone_type.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {zones.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Click &quot;Add Zone&quot; to start building your space
          </p>
        </div>
      )}
    </div>
    </div>
  )
}
