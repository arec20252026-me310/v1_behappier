"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Lightbulb, TrendingUp, AlertTriangle, Sparkles, Activity, CheckCircle } from "lucide-react"
import type { Insight } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface InsightsListProps {
  insights: Insight[]
  zones: { id: string; name: string }[]
  studies: { id: string; name: string }[]
}

const typeConfig = {
  pattern: { label: "Pattern", icon: Activity, color: "bg-chart-1/20 text-chart-1 border-chart-1/30" },
  anomaly: { label: "Anomaly", icon: AlertTriangle, color: "bg-warning/20 text-warning border-warning/30" },
  recommendation: { label: "Recommendation", icon: Sparkles, color: "bg-chart-2/20 text-chart-2 border-chart-2/30" },
  trend: { label: "Trend", icon: TrendingUp, color: "bg-chart-3/20 text-chart-3 border-chart-3/30" },
}

const severityConfig = {
  info: { label: "Info", color: "border-l-info" },
  warning: { label: "Warning", color: "border-l-warning" },
  critical: { label: "Critical", color: "border-l-destructive" },
}

export function InsightsList({ insights: initialInsights, zones, studies }: InsightsListProps) {
  const supabase = createClient()
  const [insights, setInsights] = useState(initialInsights)
  const [filter, setFilter] = useState<"all" | "unread" | "acknowledged">("all")

  const acknowledgeInsight = async (insightId: string) => {
    const { error } = await supabase
      .from('insights')
      .update({ is_acknowledged: true })
      .eq('id', insightId)

    if (!error) {
      setInsights(insights.map(i => 
        i.id === insightId ? { ...i, is_acknowledged: true } : i
      ))
    }
  }

  const filteredInsights = insights.filter(insight => {
    if (filter === "unread") return !insight.is_acknowledged
    if (filter === "acknowledged") return insight.is_acknowledged
    return true
  })

  const getZoneName = (zoneId: string) => zones.find(z => z.id === zoneId)?.name || "Unknown"
  const getStudyName = (studyId: string) => studies.find(s => s.id === studyId)?.name || "Unknown"

  if (insights.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Insights Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Insights are generated automatically as your studies collect behavioral data. 
            Start a micro-study to begin generating insights.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">All Insights</h2>
          <p className="text-sm text-muted-foreground">
            {insights.filter(i => !i.is_acknowledged).length} unread insights
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {filteredInsights.map((insight) => {
          const type = typeConfig[insight.insight_type]
          const severity = severityConfig[insight.severity]
          const TypeIcon = type.icon

          return (
            <Card 
              key={insight.id} 
              className={`bg-card border-border border-l-4 ${severity.color} ${insight.is_acknowledged ? "opacity-75" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${type.color} border`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{insight.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {type.label}
                          </Badge>
                          {insight.is_acknowledged && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                      
                      {!insight.is_acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeInsight(insight.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>

                    {insight.action_items && insight.action_items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Action Items</p>
                        <ul className="space-y-1">
                          {insight.action_items.map((item) => (
                            <li key={item.id} className="flex items-center gap-2 text-sm">
                              <div className={`w-4 h-4 rounded border ${item.completed ? 'bg-success border-success' : 'border-border'} flex items-center justify-center`}>
                                {item.completed && <Check className="h-3 w-3 text-success-foreground" />}
                              </div>
                              <span className={item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                                {item.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                      {insight.related_zones.length > 0 && (
                        <span>Zones: {insight.related_zones.map(getZoneName).join(", ")}</span>
                      )}
                      {insight.study_id && (
                        <span>Study: {getStudyName(insight.study_id)}</span>
                      )}
                      <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
