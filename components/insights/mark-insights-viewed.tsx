"use client"

import { useEffect } from "react"

export function MarkInsightsViewed() {
  useEffect(() => {
    localStorage.setItem("behappier_insights_viewed_at", new Date().toISOString())
  }, [])
  return null
}
