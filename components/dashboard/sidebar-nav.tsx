"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  LayoutDashboard,
  Map,
  BarChart3,
  FlaskConical,
  Lightbulb,
  ChartSpline,
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { launchExpeStudies } from "@/app/actions/expe-launch"
import { stopExpeStudies } from "@/app/actions/expe-stop"
import { EXPE_SPACE_ID } from "@/lib/demo-seeds"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Space Builder",
    href: "/dashboard/space",
    icon: Map,
  },
  {
    title: "Behaviors",
    href: "/dashboard/behaviors",
    icon: BarChart3,
  },
  {
    title: "Micro-Studies",
    href: "/dashboard/studies",
    icon: FlaskConical,
  },
  {
    title: "Insights",
    href: "/dashboard/insights",
    icon: Lightbulb,
  },
  {
    title: "Models",
    href: "/dashboard/models",
    icon: ChartSpline,
  },
]

export function SidebarNav({ defaultSpaceId }: { defaultSpaceId?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [showcaseMode, setShowcaseMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isStudyRunning, setIsStudyRunning] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)

  const isExpe = defaultSpaceId === EXPE_SPACE_ID

  async function handleLaunchStudies() {
    setIsLaunching(true)
    setStopError(null)
    localStorage.setItem("behappier_insights_viewed_at", new Date().toISOString())
    window.dispatchEvent(new CustomEvent("behappier:insights-cleared"))
    const result = await launchExpeStudies()
    if (!result.error) { setIsStudyRunning(true); router.refresh() }
    setIsLaunching(false)
  }

  async function handleStopStudies() {
    setIsStopping(true)
    setStopError(null)
    const result = await stopExpeStudies()
    if (result.error) {
      setStopError(result.error)
      setIsStopping(false)
    } else {
      setIsStudyRunning(false)
      setIsStopping(false)
      router.refresh()
    }
  }

  async function toggleShowcaseMode() {
    const next = !showcaseMode
    setShowcaseMode(next)
    if (next) setCollapsed(true)
    localStorage.setItem("behappier_showcase_mode", next ? "true" : "false")
    window.dispatchEvent(new StorageEvent("storage", { key: "behappier_showcase_mode", newValue: next ? "true" : "false" }))
    if (next) {
      try { await document.documentElement.requestFullscreen() } catch {}
    } else {
      if (document.fullscreenElement) document.exitFullscreen()
    }
  }

  useEffect(() => {
    const showcase = localStorage.getItem("behappier_showcase_mode") === "true"
    setShowcaseMode(showcase)
    if (showcase) setCollapsed(true)
    setIsFullscreen(!!document.fullscreenElement)

    function handleStorage(e: StorageEvent) {
      if (e.key === "behappier_showcase_mode") {
        const on = e.newValue === "true"
        setShowcaseMode(on)
        setCollapsed(on)
      }
    }
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    window.addEventListener("storage", handleStorage)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      window.removeEventListener("storage", handleStorage)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Subscribe to running EXPE studies so stop button appears/disappears correctly
  useEffect(() => {
    if (!showcaseMode || !isExpe) { setIsStudyRunning(false); return }

    const supabase = createClient()

    async function checkRunning() {
      const { data } = await supabase
        .from("BE_studies")
        .select("study_id")
        .eq("building_id", EXPE_SPACE_ID)
        .eq("status", "running")
        .limit(1)
      setIsStudyRunning(!!(data?.length))
    }

    checkRunning()

    const channel = supabase
      .channel("sidebar-expe-study-status")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "BE_studies",
        filter: `building_id=eq.${EXPE_SPACE_ID}`,
      }, () => { checkRunning() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [showcaseMode, isExpe])

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center">
            <Image src="/looking-glass-name.png" alt="Looking Glass" width={180} height={36} className="object-contain" style={{ maxHeight: 36 }} />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent shrink-0",
            collapsed && "mx-auto"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-base font-semibold">{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        {showcaseMode && isExpe && (
          isStudyRunning ? (
            <button
              onClick={handleStopStudies}
              disabled={isStopping}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50 disabled:cursor-wait",
                collapsed && "justify-center px-0"
              )}
              title={isStopping ? "Stopping studies…" : "Stop EXPE studies"}
            >
              <Square className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="text-base font-semibold">
                  {isStopping ? "Stopping…" : "Stop Studies"}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={handleLaunchStudies}
              disabled={isLaunching}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50 disabled:cursor-wait",
                collapsed && "justify-center px-0"
              )}
              title={isLaunching ? "Launching studies…" : "Launch EXPE studies"}
            >
              <Play className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="text-base font-semibold">
                  {isLaunching ? "Launching…" : "Launch Studies"}
                </span>
              )}
            </button>
          )
        )}
        {showcaseMode && isExpe && !collapsed && stopError && (
          <p className="px-4 py-1 text-xs text-destructive truncate" title={stopError}>
            Stop failed: {stopError}
          </p>
        )}
        {showcaseMode && !isFullscreen && (
          <button
            onClick={() => document.documentElement.requestFullscreen()}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-orange-400 hover:bg-sidebar-accent",
              collapsed && "justify-center px-0"
            )}
            title="Enter fullscreen"
          >
            <Maximize2 className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-base font-semibold">Enter Fullscreen</span>}
          </button>
        )}
        <button
          onClick={toggleShowcaseMode}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
          title={showcaseMode ? "Turn off showcase mode" : "Showcase mode"}
        >
          {showcaseMode
            ? <Minimize2 className="h-5 w-5 shrink-0" />
            : <Maximize2 className="h-5 w-5 shrink-0" />}
          {!collapsed && <span className="text-base font-semibold">{showcaseMode ? "Showcase On" : "Showcase Mode"}</span>}
        </button>
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-base font-semibold">Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
