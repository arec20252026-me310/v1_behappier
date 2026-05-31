"use client"

import { useEffect, useState } from "react"

export function DashboardSettings() {
  const [showcaseMode, setShowcaseMode] = useState(false)

  useEffect(() => {
    setShowcaseMode(localStorage.getItem("behappier_showcase_mode") === "true")
  }, [])

  async function toggle() {
    const next = !showcaseMode
    setShowcaseMode(next)
    localStorage.setItem("behappier_showcase_mode", next ? "true" : "false")

    if (next) {
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        // Fullscreen not supported or denied by browser
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          showcaseMode ? "bg-primary" : "bg-muted-foreground/30"
        }`}
        role="switch"
        aria-checked={showcaseMode}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            showcaseMode ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-muted-foreground">
        {showcaseMode ? "Showcase mode on" : "Showcase mode off"}
      </span>
    </div>
  )
}
