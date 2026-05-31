"use client"

import { useEffect, useState } from "react"

export function DashboardSettings() {
  const [showCards, setShowCards] = useState(true)

  useEffect(() => {
    setShowCards(localStorage.getItem("behappier_hide_metric_cards") !== "true")
  }, [])

  function toggle() {
    const next = !showCards
    setShowCards(next)
    localStorage.setItem("behappier_hide_metric_cards", next ? "false" : "true")
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          showCards ? "bg-primary" : "bg-muted-foreground/30"
        }`}
        role="switch"
        aria-checked={showCards}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            showCards ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-muted-foreground">
        {showCards ? "Metric cards visible" : "Metric cards hidden"}
      </span>
    </div>
  )
}
