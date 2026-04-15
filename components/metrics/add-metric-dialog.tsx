"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Check, BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Metric } from "@/lib/types"
import { METRIC_CATEGORIES, PREDEFINED_METRICS } from "@/lib/types"
import { Spinner } from "@/components/ui/spinner"

interface AddMetricDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  existingMetrics: Metric[]
  onMetricAdded: (metric: Metric) => void
}

export function AddMetricDialog({
  open,
  onOpenChange,
  spaceId,
  existingMetrics,
  onMetricAdded,
}: AddMetricDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"predefined" | "custom">("predefined")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "traffic_flow",
    unit: "",
    literature_reference: "",
  })

  const existingNames = existingMetrics.map(m => m.name.toLowerCase())
  const availablePredefined = PREDEFINED_METRICS.filter(
    p => !existingNames.includes(p.name.toLowerCase())
  )

  const addPredefinedMetric = async (predefined: typeof PREDEFINED_METRICS[number]) => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('metrics')
      .insert({
        space_id: spaceId,
        name: predefined.name,
        description: predefined.description,
        category: predefined.category,
        unit: predefined.unit,
        literature_reference: predefined.literature_reference,
        is_active: true,
      })
      .select()
      .single()

    if (data && !error) {
      onMetricAdded(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('metrics')
      .insert({
        space_id: spaceId,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        unit: formData.unit || null,
        literature_reference: formData.literature_reference || null,
        is_active: true,
      })
      .select()
      .single()

    if (data && !error) {
      onMetricAdded(data)
      setFormData({
        name: "",
        description: "",
        category: "traffic_flow",
        unit: "",
        literature_reference: "",
      })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Metric</DialogTitle>
          <DialogDescription>
            Choose from research-backed metrics or create a custom one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "predefined" | "custom")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predefined">Research-Backed</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="predefined" className="mt-4">
            {availablePredefined.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                All predefined metrics have been added
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {availablePredefined.map((predefined) => (
                  <div
                    key={predefined.name}
                    className="flex items-start justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {predefined.name}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {predefined.category.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {predefined.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground italic">
                          {predefined.literature_reference}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPredefinedMetric(predefined)}
                      disabled={loading}
                    >
                      {loading ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Metric Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Average Queue Length"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit of Measurement</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., minutes, count, percentage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this metric measure?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Literature Reference (optional)</Label>
                <Input
                  id="reference"
                  value={formData.literature_reference}
                  onChange={(e) => setFormData({ ...formData, literature_reference: e.target.value })}
                  placeholder="e.g., Author (Year). Title"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !formData.name}>
                  {loading && <Spinner className="mr-2 h-4 w-4" />}
                  Add Metric
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
