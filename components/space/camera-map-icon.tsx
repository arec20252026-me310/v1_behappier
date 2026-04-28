"use client"

import { cn } from "@/lib/utils"
import type { CameraDirection } from "@/lib/types"

interface CameraMapIconProps {
  direction: CameraDirection
  size?: number
  selected?: boolean
  className?: string
  label?: string
  showLabel?: boolean
}

/**
 * Standardized camera visualization for floor plan maps.
 * Shows a camera body icon with a semi-transparent FOV cone indicating direction.
 */
export function CameraMapIcon({
  direction,
  size = 28,
  selected = false,
  className,
  label,
  showLabel = false,
}: CameraMapIconProps) {
  const coneLength = size * 1.4
  const halfAngle = 35 // degrees half-angle of FOV cone

  // Compute cone tip and two far-edge points based on direction
  // Camera body center is at (cx, cy) within a padded SVG
  const padding = coneLength + 4
  const svgSize = size + padding * 2
  const cx = svgSize / 2
  const cy = svgSize / 2

  // Direction angles: the cone opens *away* from the camera
  const dirAngles: Record<CameraDirection, number> = {
    up: -90,
    down: 90,
    right: 0,
    left: 180,
  }

  const baseDeg = dirAngles[direction]
  const toRad = (d: number) => (d * Math.PI) / 180

  const tip = { x: cx, y: cy }
  const far1 = {
    x: cx + coneLength * Math.cos(toRad(baseDeg - halfAngle)),
    y: cy + coneLength * Math.sin(toRad(baseDeg - halfAngle)),
  }
  const far2 = {
    x: cx + coneLength * Math.cos(toRad(baseDeg + halfAngle)),
    y: cy + coneLength * Math.sin(toRad(baseDeg + halfAngle)),
  }

  // Arc from far1 to far2 along the radius coneLength
  const largeArc = halfAngle * 2 > 180 ? 1 : 0
  const sweep = 1

  const conePath = [
    `M ${tip.x} ${tip.y}`,
    `L ${far1.x} ${far1.y}`,
    `A ${coneLength} ${coneLength} 0 ${largeArc} ${sweep} ${far2.x} ${far2.y}`,
    "Z",
  ].join(" ")

  // Camera body: a rounded rect for the body + a small lens circle
  const bodyW = size * 0.72
  const bodyH = size * 0.5
  const bodyX = cx - bodyW / 2
  const bodyY = cy - bodyH / 2
  const lensR = size * 0.16

  return (
    <div className={cn("flex flex-col items-center gap-0.5 pointer-events-none select-none", className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ overflow: "visible" }}
      >
        {/* FOV cone */}
        <path
          d={conePath}
          fill={selected ? "rgba(99,179,237,0.28)" : "rgba(99,179,237,0.18)"}
          stroke={selected ? "rgba(99,179,237,0.7)" : "rgba(99,179,237,0.4)"}
          strokeWidth={0.8}
        />

        {/* Camera body shadow */}
        <rect
          x={bodyX + 1}
          y={bodyY + 1.5}
          width={bodyW}
          height={bodyH}
          rx={3}
          fill="rgba(0,0,0,0.35)"
        />

        {/* Camera body */}
        <rect
          x={bodyX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          rx={3}
          fill={selected ? "#2D3F56" : "#1C2A3A"}
          stroke={selected ? "#63B3ED" : "#4A90D9"}
          strokeWidth={selected ? 1.5 : 1}
        />

        {/* Lens circle */}
        <circle
          cx={cx}
          cy={cy}
          r={lensR}
          fill={selected ? "#63B3ED" : "#3B82F6"}
          stroke={selected ? "#BFEFFF" : "#60A5FA"}
          strokeWidth={0.8}
        />

        {/* Lens inner highlight */}
        <circle
          cx={cx - lensR * 0.25}
          cy={cy - lensR * 0.25}
          r={lensR * 0.3}
          fill="rgba(255,255,255,0.4)"
        />

        {/* Mount tab on opposite side of direction */}
        {(() => {
          const mountSize = size * 0.14
          const offsets: Record<CameraDirection, { x: number; y: number }> = {
            up:    { x: cx - mountSize / 2, y: cy + bodyH / 2 - 1 },
            down:  { x: cx - mountSize / 2, y: cy - bodyH / 2 - mountSize + 1 },
            right: { x: cx - bodyW / 2 - mountSize + 1, y: cy - mountSize / 2 },
            left:  { x: cx + bodyW / 2 - 1, y: cy - mountSize / 2 },
          }
          const { x, y } = offsets[direction]
          const isHorizontal = direction === "left" || direction === "right"
          return (
            <rect
              x={x}
              y={y}
              width={isHorizontal ? mountSize : mountSize}
              height={isHorizontal ? mountSize : mountSize}
              rx={1}
              fill="#4A90D9"
            />
          )
        })()}

        {/* Selected ring */}
        {selected && (
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.52}
            fill="none"
            stroke="#63B3ED"
            strokeWidth={1.5}
            strokeDasharray="3 2"
            opacity={0.8}
          />
        )}
      </svg>

      {showLabel && label && (
        <span
          className="text-[9px] font-medium leading-none px-1 py-0.5 rounded"
          style={{
            color: "#CBD5E0",
            background: "rgba(0,0,0,0.55)",
            maxWidth: svgSize,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
