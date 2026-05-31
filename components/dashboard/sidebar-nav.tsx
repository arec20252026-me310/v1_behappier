"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  Clapperboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

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

export function SidebarNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("behappier_showcase_mode") === "true") {
      setCollapsed(true)
    }
  }, [])

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
        <Link
          href="/dashboard/demo"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Clapperboard className="h-5 w-5 shrink-0 text-sidebar-foreground/60" />
          {!collapsed && <span className="text-base font-semibold text-sidebar-foreground/60">Start Demo</span>}
        </Link>
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
