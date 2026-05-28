"use client"

import { useState } from "react"
import { Camera, X } from "lucide-react"

function snapshotUrl(imageId: string, cameraId?: string | null): string {
  // If cameraId is known, build the direct path. If it's missing (older studies
  // pre-camera_id metadata), pass only image_id and let the API auto-search.
  if (cameraId) {
    const path = `snapshots/${cameraId}/${imageId}.jpg`
    return `/api/snapshot?path=${encodeURIComponent(path)}`
  }
  return `/api/snapshot?image_id=${encodeURIComponent(imageId)}`
}

interface SnapshotCellProps {
  imageId?: string | null
  cameraId?: string | null
  onExpand?: () => void
}

export function SnapshotCell({ imageId, cameraId, onExpand }: SnapshotCellProps) {
  const [open, setOpen] = useState(false)
  // Start in "loading" so the camera icon shows until the image confirms success
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading")

  const url = imageId ? snapshotUrl(imageId, cameraId) : null
  const hasImage = !!url && imgStatus === "loaded"

  const handleClick = () => {
    if (!hasImage) return
    if (onExpand) onExpand()
    else setOpen(true)
  }

  return (
    <>
      {/* Thumbnail */}
      <button
        onClick={handleClick}
        className={`w-12 h-9 rounded overflow-hidden border flex items-center justify-center transition-colors ${
          hasImage
            ? "border-border hover:border-primary/60 cursor-zoom-in"
            : "border-border/40 cursor-default bg-muted/30"
        }`}
        disabled={!hasImage}
        title={hasImage ? "Click to enlarge" : "No snapshot"}
      >
        {url && (
          <img
            src={url}
            alt=""
            className={`w-full h-full object-cover ${imgStatus === "loaded" ? "" : "hidden"}`}
            onLoad={() => setImgStatus("loaded")}
            onError={() => setImgStatus("error")}
          />
        )}
        {imgStatus !== "loaded" && (
          <Camera className="h-3 w-3 text-muted-foreground/30" />
        )}
      </button>

      {/* Standalone lightbox (used when no onExpand is provided) */}
      {!onExpand && open && url && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={url}
            alt="Snapshot"
            className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
