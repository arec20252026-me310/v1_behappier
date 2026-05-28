"use client"

import { useState } from "react"
import { Camera, X } from "lucide-react"

interface SnapshotCellProps {
  // The pre-generated signed URL for this image, or null if no snapshot is
  // available (e.g. detection from a non-review-mode study, or signed URL
  // generation failed).
  signedUrl?: string | null
  onExpand?: () => void
}

export function SnapshotCell({ signedUrl, onExpand }: SnapshotCellProps) {
  const [open, setOpen] = useState(false)
  const [hasError, setHasError] = useState(false)

  const showImage = !!signedUrl && !hasError

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
        {!showImage && (
          <Camera className="h-3 w-3 text-muted-foreground/30" />
        )}
        {signedUrl && (
          <img
            src={signedUrl}
            alt=""
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        )}
      </button>

      {/* Standalone lightbox (only used when no onExpand handler is provided) */}
      {!onExpand && open && signedUrl && (
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
            src={signedUrl}
            alt="Snapshot"
            className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
