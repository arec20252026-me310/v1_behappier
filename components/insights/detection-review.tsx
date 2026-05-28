"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, ChevronDown, ChevronUp } from "lucide-react"

interface DetectedBehavior {
  name: string
  value: number | string
  unit?: string
}

interface Detection {
  id: string
  study_id: string
  image_id: string
  timestamp_pt: string | null
  notes: string | null
  detected_behaviors: DetectedBehavior[] | null
}

interface DetectionReviewProps {
  detections: Detection[]
  studyId: string
}

function snapshotUrl(imageId: string): string {
  // Camera is unknown at this layer; let the API auto-search camera folders.
  return `/api/snapshot?image_id=${encodeURIComponent(imageId)}`
}

export function DetectionReview({ detections, studyId }: DetectionReviewProps) {
  const [expanded, setExpanded] = useState(true)

  if (!detections.length) return null

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-foreground">Snapshot Review</span>
            <span className="text-xs text-muted-foreground">
              {detections.length} detection{detections.length !== 1 ? "s" : ""}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {detections.map(d => (
              <div key={d.id} className="flex flex-col gap-1.5 rounded-md border border-border p-2 bg-muted/20">
                {/* Thumbnail */}
                <div className="relative w-full overflow-hidden rounded" style={{ aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={snapshotUrl(d.image_id)}
                    alt={d.image_id}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).style.display = "none"
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                  <div
                    className="absolute inset-0 items-center justify-center bg-muted text-muted-foreground text-xs hidden"
                  >
                    No image
                  </div>
                </div>

                {/* Timestamp */}
                {d.timestamp_pt && (
                  <p className="text-xs text-muted-foreground font-mono truncate">{d.timestamp_pt}</p>
                )}

                {/* Detected values */}
                {d.detected_behaviors && d.detected_behaviors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.detected_behaviors.map((b, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      >
                        {b.name}: {b.value}{b.unit ? ` ${b.unit}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI notes */}
                {d.notes && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{d.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
