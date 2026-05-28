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
  // Track ONLY the explicit error state. Default is "show the image and let
  // the browser handle loading". Previously we tracked "loading" too, but the
  // onLoad event was being missed for cached images, leaving the state stuck.
  const [hasError, setHasError] = useState(false)

  const url = imageId ? snapshotUrl(imageId, cameraId) : null
  const showImage = !!url && !hasError

  const handleClick = () => {
    if (!showImage) return
    if (onExpand) onExpand()
    else setOpen(true)
  }

  return (
    <>
      {/* Thumbnail */}
      <button
        onClick={handleClick}
        className={`relative w-12 h-9 rounded overflow-hidden border flex items-center justify-center transition-colors ${
          showImage
            ? "border-border hover:border-primary/60 cursor-zoom-in"
            : "border-border/40 cursor-default bg-muted/30"
        }`}
        disabled={!showImage}
        title={showImage ? "Click to enlarge" : "No snapshot"}
      >
        {/* Camera icon shown only when there's no url, or when the image
            errored out. While loading, the icon is hidden so users see the
            image as soon as it renders. */}
        {!showImage && (
          <Camera className="h-3 w-3 text-muted-foreground/30" />
        )}
        {url && (
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
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
