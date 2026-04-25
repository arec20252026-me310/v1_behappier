"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles, Activity } from "lucide-react"
import type { Insight } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface RecentInsightsProps {
  insights: Insight[]
}

const typeConfig = {
  pattern: { label: "Pattern", icon: Activity, color: "bg-chart-1/20 text-chart-1" },
  anomaly: { label: "Anomaly", icon: AlertTriangle, color: "bg-warning/20 text-warning" },
  recommendation: { label: "Recommendation", icon: Sparkles, color: "bg-chart-2/20 text-chart-2" },
  trend: { label: "Trend", icon: TrendingUp, color: "bg-chart-3/20 text-chart-3" },
}

const severityColors = {
  info: "border-l-info",
  warning: "border-l-warning",
  critical: "border-l-destructive",
}

export function RecentInsights({ insights }: RecentInsightsProps) {
  if (insights.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Recent Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Lightbulb className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              No insights yet
            </p>
            <p className="text-xs text-muted-foreground">
              Start a study to generate insights
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Recent Insights</CardTitle>
        <Link href="/dashboard/insights">
          <Button variant="ghost" size="sm" className="text-xs">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => {
            const type = typeConfig[insight.insight_type]
            const TypeIcon = type.icon
            return (
              <div
                key={insight.id}
                className={`p-3 rounded-lg bg-secondary/50 border-l-2 ${severityColors[insight.severity]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {insight.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                  <Badge className={`shrink-0 ${type.color}`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {type.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
