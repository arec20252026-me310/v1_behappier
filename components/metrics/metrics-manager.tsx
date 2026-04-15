"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Activity, BarChart3, Users, BookOpen, Trash2, Thermometer, Shield } from "lucide-react"
import type { Space, Metric } from "@/lib/types"
import { METRIC_CATEGORIES, PREDEFINED_METRICS } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AddMetricDialog } from "./add-metric-dialog"

interface MetricsManagerProps {
  space: Space | null
  initialMetrics: Metric[]
}

const categoryIcons = {
  traffic_flow: Activity,
  utilization: BarChart3,
  social_interaction: Users,
  comfort: Thermometer,
  safety: Shield,
}

export function MetricsManager({ space, initialMetrics }: MetricsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics)
  const [showAddDialog, setShowAddDialog] = useState(false)

  if (!space) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Set up your space first to configure metrics
          </p>
          <Button onClick={() => router.push('/dashboard/space')}>
            Set Up Space
          </Button>
        </CardContent>
      </Card>
    )
  }

  const toggleMetric = async (metric: Metric) => {
    const { error } = await supabase
      .from('metrics')
      .update({ is_active: !metric.is_active })
      .eq('id', metric.id)

    if (!error) {
      setMetrics(metrics.map(m => 
        m.id === metric.id ? { ...m, is_active: !m.is_active } : m
      ))
    }
  }

  const deleteMetric = async (metricId: string) => {
    const { error } = await supabase
      .from('metrics')
      .delete()
      .eq('id', metricId)

    if (!error) {
      setMetrics(metrics.filter(m => m.id !== metricId))
    }
  }

  const handleMetricAdded = (metric: Metric) => {
    setMetrics([...metrics, metric])
    setShowAddDialog(false)
  }

  const groupedMetrics = METRIC_CATEGORIES.map(category => ({
    ...category,
    metrics: metrics.filter(m => m.category === category.value),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Behavioral Metrics</h2>
          <p className="text-sm text-muted-foreground">
            {metrics.filter(m => m.is_active).length} of {metrics.length} metrics active
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Metric
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {groupedMetrics.map((category) => {
          const Icon = categoryIcons[category.value as keyof typeof categoryIcons]
          return (
            <Card key={category.value} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">{category.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.metrics.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No metrics configured
                  </p>
                ) : (
                  category.metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {metric.name}
                          </p>
                          {metric.unit && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {metric.unit}
                            </Badge>
                          )}
                        </div>
                        {metric.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {metric.description}
                          </p>
                        )}
                        {metric.literature_reference && (
                          <div className="flex items-center gap-1 mt-1">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground italic truncate">
                              {metric.literature_reference}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={metric.is_active}
                          onCheckedChange={() => toggleMetric(metric)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMetric(metric.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <AddMetricDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        spaceId={space.id}
        existingMetrics={metrics}
        onMetricAdded={handleMetricAdded}
      />
    </div>
  )
}
