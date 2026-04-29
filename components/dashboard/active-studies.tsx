"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, Play, Pause, Clock } from "lucide-react"
import type { Study } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ActiveStudiesProps {
  studies: Study[]
}

const statusConfig = {
  draft: { label: "Draft", icon: Clock, color: "bg-muted text-muted-foreground" },
  active: { label: "Active", icon: Play, color: "bg-success/20 text-success" },
  paused: { label: "Paused", icon: Pause, color: "bg-warning/20 text-warning" },
  completed: { label: "Completed", icon: FlaskConical, color: "bg-primary/20 text-primary" },
}

export function ActiveStudies({ studies }: ActiveStudiesProps) {
  if (studies.length === 0) {
    return (
      <Card className="bg-card border-border pt-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Active Studies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <FlaskConical className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No studies in progress
            </p>
            <Link href="/dashboard/studies">
              <Button size="sm">Create Study</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border pt-3">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Active Studies</CardTitle>
        <Link href="/dashboard/studies">
          <Button variant="ghost" size="sm" className="text-xs">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {studies.map((study) => {
            const status = statusConfig[study.status]
            const StatusIcon = status.icon
            return (
              <div
                key={study.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {study.name}
                  </p>
                  {study.hypothesis && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {study.hypothesis}
                    </p>
                  )}
                </div>
                <Badge className={`ml-3 ${status.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
