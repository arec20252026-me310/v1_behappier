"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/header"
import { MapPin, Activity, CheckCircle2, Eraser, ArrowRight, Loader2, EyeOff, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { enableDemoMode, disableDemoMode } from "@/app/actions/demo"

type Scenario = "blank" | "space-ready" | "study-in-progress" | "study-complete"

const SCENARIOS: {
  id: Scenario
  title: string
  badge: string
  badgeColor: string
  icon: React.ElementType
  iconColor: string
  description: string
  visible: string[]
}[] = [
  {
    id: "blank",
    title: "Blank",
    badge: "New User",
    badgeColor: "bg-muted text-muted-foreground",
    icon: Eraser,
    iconColor: "text-muted-foreground",
    description: "Hides all your real data from the UI without deleting anything. Exit demo mode to restore the view.",
    visible: [
      "Empty space setup prompt",
      "No heatmap or zone data",
      "No studies or insights",
    ],
  },
  {
    id: "space-ready",
    title: "Space Configured",
    badge: "Setup Complete",
    badgeColor: "bg-blue-500/20 text-blue-400",
    icon: MapPin,
    iconColor: "text-blue-400",
    description: "ME310 Loft is configured — 10 zones, Kitchen camera assigned. No studies or insights.",
    visible: [
      "Full floor plan with 10 zones",
      "Kitchen camera pin visible",
      "No active study yet",
    ],
  },
  {
    id: "study-in-progress",
    title: "Study Running",
    badge: "Live",
    badgeColor: "bg-green-500/20 text-green-400",
    icon: Activity,
    iconColor: "text-green-400",
    description: "A 5-minute occupancy study is actively monitoring the Kitchen zone. No insights yet.",
    visible: [
      "Live heatmap with colored zones",
      "Kitchen at ~63% occupancy",
      "Active study badge + preview status",
    ],
  },
  {
    id: "study-complete",
    title: "Study Complete",
    badge: "Insights Ready",
    badgeColor: "bg-yellow-500/20 text-yellow-400",
    icon: CheckCircle2,
    iconColor: "text-yellow-400",
    description: "Study finished — AI insights are ready, Kitchen zone is flagged.",
    visible: [
      "Kitchen zone glows yellow on heatmap",
      "Click zone to read insight summary",
      "Full report available in Insights tab",
    ],
  },
]

export default function DemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<Scenario | null>(null)
  const [loaded, setLoaded] = useState<Scenario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoActive, setDemoActive] = useState(false)

  useEffect(() => {
    setDemoActive(document.cookie.includes("demo_mode=1"))
  }, [])

  const loadScenario = async (scenario: Scenario) => {
    setLoading(scenario)
    setError(null)
    try {
      if (scenario === "blank") {
        // Cookie-only: hides real data without touching the database
        await enableDemoMode()
        return
      }

      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "Failed")
      }
      setLoaded(scenario)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Start Demo"
        subtitle="Load a preset state for demos and user interviews"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">

        {/* Demo mode status */}
        {demoActive ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <EyeOff className="h-4 w-4 shrink-0" />
              <span className="font-medium">Demo mode is active</span>
              <span className="text-yellow-400/60 hidden sm:inline">— real database data is hidden</span>
            </div>
            <form action={disableDemoMode}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-yellow-500/40 text-yellow-400 hover:border-yellow-500/80 hover:text-yellow-300 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                Exit demo mode
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Eye className="h-4 w-4 shrink-0" />
            <span>Demo mode is off — real data is visible. Load a scenario below to begin.</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            {error.includes("SERVICE_ROLE_KEY") && (
              <span className="block mt-1 text-xs opacity-70">
                Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server.
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCENARIOS.map((s) => {
            const isLoading = loading === s.id
            const isLoaded = loaded === s.id
            const Icon = s.icon
            return (
              <Card
                key={s.id}
                className={cn(
                  "bg-card border-border transition-all",
                  isLoaded && "ring-2 ring-primary"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5 shrink-0", s.iconColor)} />
                      <CardTitle className="text-base font-medium">{s.title}</CardTitle>
                    </div>
                    <Badge className={cn("text-xs shrink-0", s.badgeColor)}>{s.badge}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1">
                    {s.visible.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isLoaded ? "default" : "secondary"}
                      className="flex-1 gap-2"
                      disabled={!!loading}
                      onClick={() => loadScenario(s.id)}
                    >
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Loading…</>
                      ) : isLoaded ? (
                        <><CheckCircle2 className="h-4 w-4" />Loaded</>
                      ) : s.id === "blank" ? (
                        "Enter Demo Mode"
                      ) : (
                        "Load Scenario"
                      )}
                    </Button>
                    {isLoaded && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => router.push("/dashboard")}
                      >
                        Go to Dashboard
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Blank mode hides real data using a browser cookie — no database changes are made.
          <br />
          Other scenarios rewrite Supabase demo data — refresh any open dashboard tabs after loading.
        </p>
      </div>
    </div>
  )
}
