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
    'up-right': -45,
    right: 0,
    'down-right': 45,
    down: 90,
    'down-left': 135,
    left: 180,
    'up-left': -135,
  }

  const baseDeg = dirAngles[direction]
  const toRad = (d: number) => (d * Math.PI) / 180

  const tip = { x: cx, y: cy }
  const r4 = (n: number) => Math.round(n * 1e4) / 1e4
  const far1 = {
    x: r4(cx + coneLength * Math.cos(toRad(baseDeg - halfAngle))),
    y: r4(cy + coneLength * Math.sin(toRad(baseDeg - halfAngle))),
  }
  const far2 = {
    x: r4(cx + coneLength * Math.cos(toRad(baseDeg + halfAngle))),
    y: r4(cy + coneLength * Math.sin(toRad(baseDeg + halfAngle))),
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
          style={{
            fill: selected ? "var(--cam-cone-fill-sel)" : "var(--cam-cone-fill)",
            stroke: selected ? "var(--cam-cone-stroke-sel)" : "var(--cam-cone-stroke)",
          }}
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
          style={{
            fill: selected ? "var(--cam-body-fill-sel)" : "var(--cam-body-fill)",
            stroke: selected ? "var(--cam-body-stroke-sel)" : "var(--cam-body-stroke)",
          }}
          strokeWidth={selected ? 1.5 : 1}
        />

        {/* Lens circle */}
        <circle
          cx={cx}
          cy={cy}
          r={lensR}
          style={{
            fill: selected ? "var(--cam-lens-fill-sel)" : "var(--cam-lens-fill)",
            stroke: "var(--cam-lens-stroke)",
          }}
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
            up:         { x: cx - mountSize / 2, y: cy + bodyH / 2 - 1 },
            'up-right': { x: cx - bodyW / 2 - mountSize + 1, y: cy + bodyH / 2 - 1 },
            right:      { x: cx - bodyW / 2 - mountSize + 1, y: cy - mountSize / 2 },
            'down-right':{ x: cx - bodyW / 2 - mountSize + 1, y: cy - bodyH / 2 - mountSize + 1 },
            down:       { x: cx - mountSize / 2, y: cy - bodyH / 2 - mountSize + 1 },
            'down-left':{ x: cx + bodyW / 2 - 1, y: cy - bodyH / 2 - mountSize + 1 },
            left:       { x: cx + bodyW / 2 - 1, y: cy - mountSize / 2 },
            'up-left':  { x: cx + bodyW / 2 - 1, y: cy + bodyH / 2 - 1 },
          }
          const { x, y } = offsets[direction]
          return (
            <rect
              x={x}
              y={y}
              width={mountSize}
              height={mountSize}
              rx={1}
              style={{ fill: "var(--cam-mount)" }}
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
            style={{ stroke: "var(--cam-body-stroke-sel)" }}
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
