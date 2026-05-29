"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Map, FlaskConical, Lightbulb, BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"

interface MetricCardsProps {
  zonesCount: number
  studiesCount: number
  insightsCount: number
  metricsCount: number
  latestInsightAt?: string
  isDemo?: boolean
}

export function MetricCards({ zonesCount, studiesCount, insightsCount, metricsCount, latestInsightAt, isDemo = false }: MetricCardsProps) {
  const [newInsightsCount, setNewInsightsCount] = useState(insightsCount)

  useEffect(() => {
    if (isDemo) { setNewInsightsCount(insightsCount); return }
    if (!latestInsightAt) { setNewInsightsCount(0); return }
    const viewedAt = localStorage.getItem("behappier_insights_viewed_at")
    if (viewedAt && new Date(viewedAt) >= new Date(latestInsightAt)) {
      setNewInsightsCount(0)
    } else {
      setNewInsightsCount(insightsCount)
    }
  }, [isDemo, latestInsightAt, insightsCount])

  const cards = [
    {
      title: "Configured Zones",
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
      value: newInsightsCount,
      change: newInsightsCount === 0 ? "No new insights" : `${newInsightsCount} to review`,
      trend: newInsightsCount > 0 ? "up" : "neutral",
      icon: Lightbulb,
      color: "text-chart-4",
      href: "/dashboard/insights",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer">
            <CardContent className="px-3 py-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-foreground/70 font-medium leading-tight">{card.title}</p>
                  <p className="text-3xl font-semibold text-foreground leading-tight">{card.value}</p>
                  <div className="flex items-center gap-1">
                    {card.trend === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                    {card.trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                    <span className="text-base text-foreground/70 leading-tight">{card.change}</span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg bg-card ${card.color}`}>
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
