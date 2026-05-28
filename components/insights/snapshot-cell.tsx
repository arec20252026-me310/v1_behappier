"use client"

import { useState, useEffect, useRef } from "react"
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
  const [hasError, setHasError] = useState(false)
  // Manual lazy loading via IntersectionObserver. Safari's native loading="lazy"
  // is unreliable for large lists (1000+ items) - it sometimes never fires the
  // load. We render the <img> tag only after the cell is visible.
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLButtonElement>(null)

  const url = imageId ? snapshotUrl(imageId, cameraId) : null
  const showImage = !!url && !hasError && isVisible

  useEffect(() => {
    if (!url) return
    const el = containerRef.current
    if (!el) return
    // Generous rootMargin (2000px) means we eagerly load images that are within
    // ~3 viewport heights of being visible. With pagination at 30 rows × 36px
    // height = 1080px, this covers the entire current page on any screen size,
    // even small browser windows, without waiting for a scroll event.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "2000px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [url])

  const handleClick = () => {
    if (!showImage) return
    if (onExpand) onExpand()
    else setOpen(true)
  }

  return (
    <>
      {/* Thumbnail */}
      <button
        ref={containerRef}
        onClick={handleClick}
        className={`relative w-12 h-9 rounded overflow-hidden border flex items-center justify-center transition-colors ${
          showImage
            ? "border-border hover:border-primary/60 cursor-zoom-in"
            : "border-border/40 cursor-default bg-muted/30"
        }`}
        disabled={!showImage}
        title={showImage ? "Click to enlarge" : "No snapshot"}
      >
        {/* Camera icon placeholder shown when the image hasn't loaded (either
            not yet visible, errored, or missing url). */}
        {!showImage && (
          <Camera className="h-3 w-3 text-muted-foreground/30" />
        )}
        {/* Only render the <img> tag after the cell is visible. This prevents
            the browser from queuing up 1000+ image requests on initial render. */}
        {url && isVisible && (
          <img
            src={url}
            alt=""
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
