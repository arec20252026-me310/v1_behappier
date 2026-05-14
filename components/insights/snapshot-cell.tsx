"use client"

import { useState } from "react"
import { Camera, X } from "lucide-react"

function snapshotUrl(imageId: string): string {
  const path = `snapshots/camera_loft_camera_fluent/${imageId}.jpg`
  return `/api/snapshot?path=${encodeURIComponent(path)}`
}

export function SnapshotCell({ imageId }: { imageId?: string | null }) {
  const [open, setOpen] = useState(false)
  // Start in "loading" so the camera icon shows until the image confirms success
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading")

  const url = imageId ? snapshotUrl(imageId) : null
  const hasImage = !!url && imgStatus === "loaded"

  return (
    <>
      {/* Thumbnail */}
      <button
        onClick={() => hasImage && setOpen(true)}
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

      {/* Lightbox */}
      {open && url && (
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
