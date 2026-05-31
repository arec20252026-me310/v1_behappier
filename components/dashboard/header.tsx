"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-primary/15 bg-primary/8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 bg-card/70 border-border/50"
          />
        </div>

        <div className="relative" ref={ref}>
          <Button variant="ghost" size="icon" onClick={() => setOpen(v => !v)}>
            <Bell className="h-5 w-5" />
          </Button>
          {open && (
            <div className="absolute right-0 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg z-50 p-4">
              <p className="text-sm text-muted-foreground text-center">No new notifications</p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
