"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Map, FlaskConical, Lightbulb, BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"

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
      href: "/dashboard/space",
    },
    {
      title: "Tracked Behaviors",
      value: metricsCount,
      change: metricsCount === 0 ? "Add behaviors" : `${metricsCount} active`,
      trend: "neutral",
      icon: BarChart3,
      color: "text-chart-2",
      href: "/dashboard/behaviors",
    },
    {
      title: "Running Studies",
      value: studiesCount,
      change: studiesCount === 0 ? "Create a study" : `${studiesCount} in progress`,
      trend: "neutral",
      icon: FlaskConical,
      color: "text-chart-3",
      href: "/dashboard/studies",
    },
    {
      title: "New Insights",
      value: insightsCount,
      change: insightsCount === 0 ? "No insights yet" : `${insightsCount} to review`,
      trend: insightsCount > 0 ? "up" : "neutral",
      icon: Lightbulb,
      color: "text-chart-4",
      href: "/dashboard/insights",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="bg-card border-border py-2 hover:bg-secondary/30 transition-colors cursor-pointer">
            <CardContent className="px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-semibold text-foreground mt-0.5">{card.value}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {card.trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
                    {card.trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
                    <span className="text-sm text-muted-foreground">{card.change}</span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg bg-secondary ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
