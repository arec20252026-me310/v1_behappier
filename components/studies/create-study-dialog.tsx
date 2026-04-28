"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import type { Study, Zone, Metric } from "@/lib/types"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CreateStudyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  zones: Zone[]
  metrics: Metric[]
  onStudyCreated: (study: Study) => void
}

export function CreateStudyDialog({
  open,
  onOpenChange,
  spaceId,
  zones,
  metrics,
  onStudyCreated,
}: CreateStudyDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hypothesis: "",
    planned_duration_minutes: null as number | null,
    target_zones: [] as string[],
    target_metrics: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('studies')
      .insert({
        space_id: spaceId,
        name: formData.name,
        description: formData.description || null,
        hypothesis: formData.hypothesis || null,
        planned_duration_minutes: formData.planned_duration_minutes,
        target_zones: formData.target_zones,
        target_metrics: formData.target_metrics,
        status: 'draft',
      })
      .select()
      .single()

    if (data && !error) {
      onStudyCreated(data)
      setFormData({
        name: "",
        description: "",
        hypothesis: "",
        planned_duration_minutes: null,
        target_zones: [],
        target_metrics: [],
      })
    }
    setLoading(false)
  }

  const toggleZone = (zoneId: string) => {
    setFormData({
      ...formData,
      target_zones: formData.target_zones.includes(zoneId)
        ? formData.target_zones.filter(id => id !== zoneId)
        : [...formData.target_zones, zoneId]
    })
  }

  const toggleMetric = (metricId: string) => {
    setFormData({
      ...formData,
      target_metrics: formData.target_metrics.includes(metricId)
        ? formData.target_metrics.filter(id => id !== metricId)
        : [...formData.target_metrics, metricId]
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Micro-Study</DialogTitle>
          <DialogDescription>
            Set up a focused analysis session to test a hypothesis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Study Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Rush Hour Analysis"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hypothesis">Hypothesis</Label>
            <Textarea
              id="hypothesis"
              value={formData.hypothesis}
              onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
              placeholder="What do you expect to find? e.g., The lobby is underutilized between 2-4pm"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional context about this study..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Planned Duration</Label>
            <select
              id="duration"
              value={formData.planned_duration_minutes ?? ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                planned_duration_minutes: e.target.value ? parseInt(e.target.value) : null 
              })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a duration...</option>
              {/* 5-minute increments up to 1 hour */}
              {Array.from({ length: 12 }, (_, i) => (i + 1) * 5).map(minutes => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
              {/* 1-2 hours by 5 minute increments */}
              {Array.from({ length: 12 }, (_, i) => 65 + i * 5).map(minutes => (
                <option key={minutes} value={minutes}>
                  {Math.floor(minutes / 60)}h {minutes % 60}m
                </option>
              ))}
              {/* 2-12 hours by 30 minute increments */}
              {Array.from({ length: 21 }, (_, i) => 120 + i * 30).map(minutes => (
                <option key={minutes} value={minutes}>
                  {Math.floor(minutes / 60)}h {minutes % 60}m
                </option>
              ))}
              {/* 1-12 weeks by day increments */}
              {Array.from({ length: 84 }, (_, i) => (i + 1) * 1440).map(minutes => {
                const days = Math.floor(minutes / 1440);
                const weeks = Math.floor(days / 7);
                const remainingDays = days % 7;
                return (
                  <option key={minutes} value={minutes}>
                    {weeks > 0 ? `${weeks}w` : ""} {remainingDays > 0 ? `${remainingDays}d` : ""}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-muted-foreground">
              Range: 5 minutes to 12 weeks in 5-minute increments
            </p>
          </div>

          <div className="space-y-2">
            <Label>Target Zones</Label>
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No zones configured. Set up zones in the Space Editor first.
              </p>
            ) : (
              <ScrollArea className="h-[120px] rounded border border-border p-3">
                <div className="space-y-2">
                  {zones.map((zone) => (
                    <div key={zone.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`zone-${zone.id}`}
                        checked={formData.target_zones.includes(zone.id)}
                        onCheckedChange={() => toggleZone(zone.id)}
                      />
                      <label
                        htmlFor={`zone-${zone.id}`}
                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        {zone.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tracked Metrics</Label>
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No metrics configured. Add metrics in the Metrics page first.
              </p>
            ) : (
              <ScrollArea className="h-[120px] rounded border border-border p-3">
                <div className="space-y-2">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`metric-${metric.id}`}
                        checked={formData.target_metrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetric(metric.id)}
                      />
                      <label
                        htmlFor={`metric-${metric.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {metric.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({metric.category.replace('_', ' ')})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Create Study
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
