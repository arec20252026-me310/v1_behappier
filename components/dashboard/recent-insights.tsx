"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb } from "lucide-react"
import type { BEInsightOutput } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface RecentInsightsProps {
  outputs: BEInsightOutput[]
}

export function RecentInsights({ outputs }: RecentInsightsProps) {
  if (outputs.length === 0) {
    return (
      <Card className="bg-card border-border pt-2 pb-4">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-base font-medium">Recent Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Lightbulb className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No insights yet</p>
            <p className="text-xs text-muted-foreground">Start a study to generate insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Flatten the most recent insight strings across all outputs (up to 4)
  const recentItems: { text: string; key: string; mode: BEInsightOutput["output_mode"] }[] = []
  for (const output of outputs) {
    for (let i = 0; i < output.insights.length; i++) {
      recentItems.push({ text: output.insights[i], key: `${output.id}-${i}`, mode: output.output_mode })
      if (recentItems.length >= 4) break
    }
    if (recentItems.length >= 4) break
  }

  return (
    <Card className="bg-card border-border pt-2 pb-4">
      <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Recent Insights</CardTitle>
        <Link href="/dashboard/insights">
          <Button variant="ghost" size="sm" className="text-xs">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentItems.map(item => (
            <div
              key={item.key}
              className="p-3 rounded-lg bg-secondary/50 border-l-2 border-l-chart-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground line-clamp-2">{item.text}</p>
                <Badge className="shrink-0 bg-chart-4/20 text-chart-4 text-xs border-0">
                  {item.mode === "final_insights" ? "Final" : "Preview"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
