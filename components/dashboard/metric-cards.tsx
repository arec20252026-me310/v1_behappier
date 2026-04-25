"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Map, FlaskConical, Lightbulb, BarChart3, TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardsProps {
  zonesCount: number
  studiesCount: number
  insightsCount: number
  metricsCount: number
}

export function MetricCards({ zonesCount, studiesCount, insightsCount, metricsCount }: MetricCardsProps) {
  const cards = [
    {
      title: "Active Zones",
      value: zonesCount,
      change: zonesCount === 0 ? "Set up your space" : `${zonesCount} configured`,
      trend: "neutral",
      icon: Map,
      color: "text-chart-1",
    },
    {
      title: "Running Studies",
      value: studiesCount,
      change: studiesCount === 0 ? "Create a study" : `${studiesCount} in progress`,
      trend: "neutral",
      icon: FlaskConical,
      color: "text-chart-2",
    },
    {
      title: "New Insights",
      value: insightsCount,
      change: insightsCount === 0 ? "No insights yet" : `${insightsCount} to review`,
      trend: insightsCount > 0 ? "up" : "neutral",
      icon: Lightbulb,
      color: "text-chart-3",
    },
    {
      title: "Tracked Metrics",
      value: metricsCount,
      change: metricsCount === 0 ? "Add metrics" : `${metricsCount} active`,
      trend: "neutral",
      icon: BarChart3,
      color: "text-chart-4",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-semibold text-foreground mt-1">{card.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {card.trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
                  {card.trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className="text-xs text-muted-foreground">{card.change}</span>
                </div>
              </div>
              <div className={`p-2 rounded-lg bg-secondary ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
