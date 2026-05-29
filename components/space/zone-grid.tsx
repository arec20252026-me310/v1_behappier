"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import type { Zone, CameraPlacement, CameraDirection } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CameraMapIcon } from "./camera-map-icon"

interface ZoneGridProps {
  zones: Zone[]
  selectedZone: Zone | null
  onSelectZone: (zone: Zone | null) => void
  onUpdateZone: (zone: Zone) => void
  floorPlanUrl?: string | null
  gridResolution?: number
  cameras?: CameraPlacement[]
  onUpdateCameras?: (cameras: CameraPlacement[]) => void
}

const DEFAULT_GRID_SIZE = 8

export function ZoneGrid({
  zones,
  selectedZone,
  onSelectZone,
  onUpdateZone,
  floorPlanUrl,
  gridResolution = DEFAULT_GRID_SIZE,
  cameras = [],
  onUpdateCameras,
}: ZoneGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 })

  // Defer camera rendering until after hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Track floor plan image aspect ratio so the grid canvas matches the image shape
  const [imgAspectRatio, setImgAspectRatio] = useState<number | null>(null)
  const floorPlanImgRef = useRef<HTMLImageElement>(null)

  // Handle both fresh loads and cached images (cached images may not fire onLoad)
  useEffect(() => {
    const img = floorPlanImgRef.current
    if (!img) return
    const apply = (el: HTMLImageElement) => {
      if (el.naturalWidth && el.naturalHeight) {
        setImgAspectRatio(el.naturalWidth / el.naturalHeight)
      }
    }
    if (img.complete) {
      apply(img)
    } else {
      img.addEventListener('load', () => apply(img), { once: true })
    }
  }, [floorPlanUrl])

  // Measure container width and track viewport height so the grid fits without scrolling
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(480)
  const [viewportHeight, setViewportHeight] = useState(700)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w)
    })
    observer.observe(el)
    const updateVH = () => setViewportHeight(window.innerHeight)
    updateVH()
    window.addEventListener('resize', updateVH)
    return () => { observer.disconnect(); window.removeEventListener('resize', updateVH) }
  }, [])

  // Camera drag state
  const [draggingCamera, setDraggingCamera] = useState<string | null>(null)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [cameraDragStart, setCameraDragStart] = useState({ x: 0, y: 0, camX: 0, camY: 0 })

  // Separate column and row extents so the canvas can be non-square
  const gridCols = Math.max(gridResolution, ...zones.map(z => z.grid_x + z.grid_width))
  const gridRowsMin = Math.max(1, ...zones.map(z => z.grid_y + z.grid_height))
  // When an image is loaded, derive rows from aspect ratio; otherwise keep square
  const gridRows = imgAspectRatio
    ? Math.max(Math.round(gridCols / imgAspectRatio), gridRowsMin)
    : Math.max(gridCols, gridRowsMin)

  // Cell size is the average of width-fit and height-fit — zoomed in but not overflowing
  const maxCellByWidth = Math.floor(containerWidth / gridCols)
  const availableHeight = viewportHeight - 320
  const maxCellByHeight = gridRows > 0 ? Math.floor(availableHeight / gridRows) : maxCellByWidth
  // Small grids (low resolution) produce oversized cells — scale back
  const zoomFactor = gridResolution <= 20 ? 0.80 : 1.0
  const cellSize = Math.max(1, Math.floor((maxCellByWidth + maxCellByHeight) / 2 * zoomFactor))

  const gridWidth = gridCols * cellSize
  const gridHeight = gridRows * cellSize

  // Offset where the image actually starts when centered with object-contain
  const [imgOffsetX, imgOffsetY] = useMemo(() => {
    if (!imgAspectRatio || gridWidth === 0 || gridHeight === 0) return [0, 0]
    const containerAR = gridWidth / gridHeight
    if (containerAR > imgAspectRatio) {
      // Container wider than image → fills height, horizontal bars left/right
      const renderedWidth = gridHeight * imgAspectRatio
      return [(gridWidth - renderedWidth) / 2, 0]
    }
    // Container taller than image → fills width, vertical bars top/bottom
    const renderedHeight = gridWidth / imgAspectRatio
    return [0, (gridHeight - renderedHeight) / 2]
  }, [imgAspectRatio, gridWidth, gridHeight])

  const handleMouseDown = useCallback((e: React.MouseEvent, zone: Zone) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(zone.id)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelectZone(zone)
    setSelectedCamera(null)
  }, [onSelectZone])

  const handleResizeStart = useCallback((e: React.MouseEvent, zone: Zone) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(zone.id)
    setDragStart({ x: e.clientX, y: e.clientY })
    setResizeStart({ width: zone.grid_width, height: zone.grid_height })
  }, [])

  const handleCameraMouseDown = useCallback((e: React.MouseEvent, cam: CameraPlacement) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingCamera(cam.id)
    setSelectedCamera(cam.id)
    setCameraDragStart({ x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y })
    onSelectZone(null)
  }, [onSelectZone])

  const handleCameraRightClick = useCallback((e: React.MouseEvent, cam: CameraPlacement) => {
    e.preventDefault()
    e.stopPropagation()
    const dirs: CameraDirection[] = ['up', 'right', 'down', 'left']
    const idx = dirs.indexOf(cam.direction)
    const nextDir = dirs[(idx + 1) % dirs.length]
    if (onUpdateCameras) {
      onUpdateCameras(cameras.map(c => c.id === cam.id ? { ...c, direction: nextDir } : c))
    }
  }, [cameras, onUpdateCameras])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return

    if (dragging) {
      const zone = zones.find(z => z.id === dragging)
      if (!zone) return

      const deltaX = Math.round((e.clientX - dragStart.x) / cellSize)
      const deltaY = Math.round((e.clientY - dragStart.y) / cellSize)

      if (deltaX !== 0 || deltaY !== 0) {
        const newX = Math.max(0, Math.min(gridCols - zone.grid_width, zone.grid_x + deltaX))
        const newY = Math.max(0, Math.min(gridRows - zone.grid_height, zone.grid_y + deltaY))

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

      const newWidth = Math.max(1, Math.min(gridCols - zone.grid_x, resizeStart.width + deltaX))
      const newHeight = Math.max(1, Math.min(gridRows - zone.grid_y, resizeStart.height + deltaY))

      if (newWidth !== zone.grid_width || newHeight !== zone.grid_height) {
        onUpdateZone({ ...zone, grid_width: newWidth, grid_height: newHeight })
      }
    }

    if (draggingCamera && onUpdateCameras) {
      const cam = cameras.find(c => c.id === draggingCamera)
      if (!cam) return

      const rawX = cameraDragStart.camX + (e.clientX - cameraDragStart.x)
      const rawY = cameraDragStart.camY + (e.clientY - cameraDragStart.y)

      const newX = Math.max(0, Math.min(gridWidth - 20, rawX))
      const newY = Math.max(0, Math.min(gridHeight - 20, rawY))
      const fracX = gridWidth > 0 ? Math.max(0, newX - imgOffsetX) / gridWidth : 0
      const fracY = gridHeight > 0 ? Math.max(0, newY - imgOffsetY) / gridHeight : 0

      onUpdateCameras(cameras.map(c => c.id === draggingCamera ? { ...c, x: newX, y: newY, fracX, fracY } : c))
    }
  }, [dragging, resizing, draggingCamera, dragStart, resizeStart, cameraDragStart, zones, cameras, onUpdateZone, onUpdateCameras, gridCols, gridRows, gridWidth, gridHeight, cellSize])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
    setDraggingCamera(null)
  }, [])

  const getCameraZone = useCallback((cam: CameraPlacement) => {
    const gridX = (cam.x - imgOffsetX) / cellSize
    const gridY = (cam.y - imgOffsetY) / cellSize
    return zones.find(z =>
      gridX >= z.grid_x && gridX < z.grid_x + z.grid_width &&
      gridY >= z.grid_y && gridY < z.grid_y + z.grid_height
    )
  }, [zones, cellSize, imgOffsetX, imgOffsetY])

  const getZoneCenter = useCallback((zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return null
    return {
      x: (zone.grid_x + zone.grid_width / 2) * cellSize + imgOffsetX,
      y: (zone.grid_y + zone.grid_height / 2) * cellSize + imgOffsetY,
    }
  }, [zones, cellSize, imgOffsetX, imgOffsetY])

  return (
    <div ref={containerRef} className="overflow-auto max-h-[calc(100vh-280px)] rounded-lg border border-border flex justify-center">
      <div
        ref={gridRef}
        className="relative"
        style={{
          width: gridWidth,
          height: gridHeight,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => { setSelectedCamera(null) }}
      >
        {/* Floor plan background — object-contain so it looks correct even before aspect ratio is measured */}
        {floorPlanUrl ? (
          <img
            ref={floorPlanImgRef}
            src={floorPlanUrl}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain opacity-80 dark:opacity-50"
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
          {Array.from({ length: Math.min(gridCols, 26) }).map((_, i) => (
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
          {Array.from({ length: gridRows }).map((_, i) => (
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
              left: zone.grid_x * cellSize + imgOffsetX,
              top: zone.grid_y * cellSize + imgOffsetY,
              width: zone.grid_width * cellSize - 2,
              height: zone.grid_height * cellSize - 2,
              backgroundColor: `${zone.color}66`,
              borderColor: zone.color,
            }}
            onMouseDown={(e) => handleMouseDown(e, zone)}
            onClick={(e) => { e.stopPropagation(); onSelectZone(zone) }}
          >
            <div className="p-1 h-full flex flex-col overflow-hidden">
              <span
                className="text-[10px] font-semibold truncate leading-tight text-white"
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.5)'
                }}
              >
                {zone.name}
              </span>
              {zone.zone_type && zone.grid_height > 1 && (
                <span className="text-[8px] text-white/80 capitalize truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
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

        {/* Camera zone-link lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: gridWidth, height: gridHeight, zIndex: 15 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(99,179,237,0.7)" />
            </marker>
          </defs>
          {mounted && cameras.map((cam) => {
            const insideZone = getCameraZone(cam)
            const assignedZone = zones.find(z => z.id === cam.zoneId)
            if (insideZone?.id === cam.zoneId) return null
            const center = getZoneCenter(cam.zoneId)
            if (!center || !assignedZone) return null
            return (
              <g key={`link-${cam.id}`}>
                <line
                  x1={cam.x + imgOffsetX}
                  y1={cam.y + imgOffsetY}
                  x2={center.x}
                  y2={center.y}
                  stroke="rgba(99,179,237,0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={(cam.x + imgOffsetX + center.x) / 2}
                  y={(cam.y + imgOffsetY + center.y) / 2 - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fill="rgba(99,179,237,0.9)"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  {assignedZone.name}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Camera icons */}
        {mounted && cameras.map((cam) => {
          const isCamSelected = selectedCamera === cam.id
          const ICON_SIZE = 28
          return (
            <div
              key={cam.id}
              className={cn(
                "absolute cursor-grab active:cursor-grabbing",
                draggingCamera === cam.id && "opacity-90"
              )}
              style={{
                left: cam.x + imgOffsetX,
                top: cam.y + imgOffsetY,
                zIndex: isCamSelected ? 30 : 20,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={(e) => handleCameraMouseDown(e, cam)}
              onContextMenu={(e) => handleCameraRightClick(e, cam)}
            >
              <CameraMapIcon
                direction={cam.direction}
                size={ICON_SIZE}
                selected={isCamSelected}
                label={cam.label}
                showLabel={isCamSelected}
              />
            </div>
          )
        })}

        {mounted && selectedCamera && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground bg-background/80 px-2 py-1 rounded pointer-events-none"
            style={{ zIndex: 40 }}
          >
            Right-click camera to rotate direction
          </div>
        )}

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
