"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlaskConical } from "lucide-react"
import type { BEStudy } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ActiveStudiesProps {
  studies: BEStudy[]
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  draft:                { label: "Draft",         color: "bg-muted text-muted-foreground" },
  planned:              { label: "Planned",        color: "bg-blue-500/20 text-blue-400" },
  needfinding_running:  { label: "Researching",    color: "bg-purple-500/20 text-purple-400" },
  needfinding_complete: { label: "Behaviors ID'd", color: "bg-purple-500/20 text-purple-400" },
  monitoring_running:   { label: "Monitoring",     color: "bg-success/20 text-success" },
  monitoring_paused:    { label: "Paused",         color: "bg-warning/20 text-warning" },
  milestone_review:     { label: "Milestone",      color: "bg-chart-1/20 text-chart-1" },
  monitoring_complete:  { label: "Data Done",      color: "bg-chart-2/20 text-chart-2" },
  insights_running:     { label: "Insights",       color: "bg-chart-3/20 text-chart-3" },
  complete:             { label: "Complete",        color: "bg-primary/20 text-primary" },
  failed:               { label: "Failed",          color: "bg-destructive/20 text-destructive" },
}

export function ActiveStudies({ studies }: ActiveStudiesProps) {
  if (studies.length === 0) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-base font-medium">Studies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <FlaskConical className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No studies yet</p>
            <Link href="/dashboard/studies">
              <Button size="sm">Create Study</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border pt-2 pb-4">
      <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Studies</CardTitle>
        <Link href="/dashboard/studies">
          <Button variant="ghost" size="sm" className="text-xs">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {studies.map(study => {
            const stage = STAGE_CONFIG[study.current_stage] ?? {
              label: study.current_stage,
              color: "bg-muted text-muted-foreground",
            }
            return (
              <div
                key={study.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <p className="text-sm font-medium text-foreground truncate flex-1 mr-3">
                  {study.study_goal}
                </p>
                <Badge className={cn(stage.color, "shrink-0 text-xs")}>{stage.label}</Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
