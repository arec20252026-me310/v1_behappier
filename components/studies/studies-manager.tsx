"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FlaskConical, Send, RefreshCw, Bot, AlertCircle, ChevronDown, ChevronUp, Pencil } from "lucide-react"
import type { Space, Zone, Metric, BEStudy, Camera } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "bg-muted text-muted-foreground" },
  planned:  { label: "Planned",  color: "bg-blue-500/20 text-blue-400" },
  active:   { label: "Active",   color: "bg-success/20 text-success" },
  complete: { label: "Complete", color: "bg-primary/20 text-primary" },
  failed:   { label: "Failed",   color: "bg-destructive/20 text-destructive" },
}

const DURATION_OPTIONS = [
  // Minutes
  ...Array.from({ length: 12 }, (_, i) => (i + 1) * 5).map(m => ({
    value: m, label: `${m} minutes`
  })),
  // Hours up to 12h
  ...Array.from({ length: 23 }, (_, i) => 60 + (i + 1) * 30).map(m => {
    const h = Math.floor(m / 60); const min = m % 60
    return { value: m, label: min > 0 ? `${h}h ${min}m` : `${h}h` }
  }),
  // Days up to 2 weeks
  ...Array.from({ length: 14 }, (_, i) => (i + 1) * 1440).map(m => {
    const d = m / 1440; const w = Math.floor(d / 7); const rem = d % 7
    const label = w > 0 && rem > 0 ? `${w}w ${rem}d` : w > 0 ? `${w}w` : `${d}d`
    return { value: m, label }
  }),
]

interface StudiesManagerProps {
  space: Space | null
  initialStudies: BEStudy[]
  zones: Zone[]
  metrics: Metric[]
  cameras?: Camera[]
}

interface N8nResponse {
  assistant_response_text: string
  action_type: string
  study_id: string | null
  study_readiness_status: string | null
}

interface FormData {
  name: string
  study_goal: string
  duration_minutes: number | null
  target_metrics: string[]
  target_zones: string[]
}

function buildMessageText(form: FormData, metrics: Metric[], zones: Zone[], cameras: Camera[]): string {
  const metricNames = form.target_metrics
    .map(id => metrics.find(m => m.id === id)?.name)
    .filter(Boolean)
    .join(", ")

  const zoneNames = form.target_zones
    .map(id => zones.find(z => z.id === id)?.name)
    .filter(Boolean)
    .join(", ")

  const durationLabel = form.duration_minutes
    ? DURATION_OPTIONS.find(o => o.value === form.duration_minutes)?.label ?? `${form.duration_minutes} minutes`
    : "not specified"

  const cameraLines = cameras
    .filter(cam => form.target_zones.length === 0 || form.target_zones.includes(cam.zone_id))
    .map(cam => {
      const zone = zones.find(z => z.id === cam.zone_id)
      const entityId = cam.metadata?.ha_entity_id ? ` (${String(cam.metadata.ha_entity_id)})` : ""
      return zone ? `  - ${zone.name}: ${cam.name}${entityId}` : null
    })
    .filter(Boolean)

  return [
    `I want to start a study with the following details:`,
    ``,
    `Study Name: ${form.name}`,
    form.study_goal ? `Study Goal: ${form.study_goal}` : null,
    `Planned Duration: ${durationLabel}`,
    zoneNames ? `Target Zones: ${zoneNames}` : null,
    metricNames ? `Metrics to Track: ${metricNames}` : null,
    cameraLines.length > 0 ? `Camera Configuration:\n${cameraLines.join("\n")}` : null,
    ``,
    `Please design a complete study plan and start the full analysis pipeline.`,
    `Use the study goal and chosen metrics to guide what the behavior monitoring agent looks for`,
    `and what the actionable insights agent should prioritize in its outputs.`,
  ]
    .filter(line => line !== null)
    .join("\n")
}

export function StudiesManager({ space, initialStudies, zones, metrics, cameras = [] }: StudiesManagerProps) {
  const router = useRouter()
  const sessionId = useRef<string>(crypto.randomUUID())
  const [studies] = useState<BEStudy[]>(initialStudies)
  const [showForm, setShowForm] = useState(false)
  const [editingStudy, setEditingStudy] = useState<BEStudy | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResponse, setLastResponse] = useState<N8nResponse | null>(null)
  const [lastStudyId, setLastStudyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    name: "",
    study_goal: "",
    duration_minutes: null,
    target_metrics: [],
    target_zones: [],
  })

  if (!space) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <FlaskConical className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Set up your space first to create studies
          </p>
          <Button onClick={() => router.push("/dashboard/space")}>Set Up Space</Button>
        </CardContent>
      </Card>
    )
  }

  const toggleMetric = (id: string) =>
    setForm(f => ({
      ...f,
      target_metrics: f.target_metrics.includes(id)
        ? f.target_metrics.filter(m => m !== id)
        : [...f.target_metrics, id],
    }))

  const toggleZone = (id: string) =>
    setForm(f => ({
      ...f,
      target_zones: f.target_zones.includes(id)
        ? f.target_zones.filter(z => z !== id)
        : [...f.target_zones, id],
    }))

  const handleEditStudy = (study: BEStudy) => {
    const meta = study.metadata as Record<string, unknown>
    const storedZones = (meta.target_zones as string[]) ?? []
    const storedMetricNames = (meta.target_metric_names as string[]) ?? []
    // Reverse-lookup metric IDs from stored names
    const storedMetricIds = metrics
      .filter(m => storedMetricNames.includes(m.name))
      .map(m => m.id)

    setForm({
      name: (meta.study_name as string) ?? study.study_goal ?? "",
      study_goal: study.study_goal ?? "",
      duration_minutes: study.duration_seconds
        ? Math.round((study.duration_seconds as number) / 60)
        : null,
      target_zones: storedZones,
      target_metrics: storedMetricIds,
    })
    setEditingStudy(study)
    setLastResponse(null)
    setError(null)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingStudy(null)
    setLastResponse(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_text: buildMessageText(form, metrics, zones, cameras),
          user_id: "behappier-user",
          session_id: sessionId.current,
          building_id: space.id,
          study_id: lastStudyId,
          existing_study_id: editingStudy?.study_id ?? null,
          study_name: form.name,
          study_goal: form.study_goal,
          target_zones: form.target_zones,
          target_metric_names: form.target_metrics
            .map(id => metrics.find(m => m.id === id)?.name)
            .filter(Boolean),
          behavior_targets: form.target_metrics
            .map(id => metrics.find(m => m.id === id))
            .filter(Boolean)
            .map(m => ({ behavior_name: m!.name, behavior_description: m!.description ?? "", behavior_units: m!.unit ?? "" })),
          duration_seconds: form.duration_minutes ? form.duration_minutes * 60 : null,
        }),
      })

      const data: N8nResponse = await res.json()
      setLastResponse(data)

      if (data.study_id) setLastStudyId(data.study_id)

      if (data.action_type === "start_study") {
        setForm({ name: "", study_goal: "", duration_minutes: null, target_metrics: [], target_zones: [] })
        setEditingStudy(null)
        setShowForm(false)
        setTimeout(() => router.refresh(), 2000)
      }
    } catch {
      setError("Failed to reach the backend. Make sure n8n is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeCount = studies.filter(s =>
    ["monitoring_running", "needfinding_running", "insights_running", "planned", "needfinding_complete"].includes(s.current_stage)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Micro-Studies</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} actively running
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.refresh()} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1">
            {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            New Study
          </Button>
        </div>
      </div>

      {/* New study form */}
      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              {editingStudy ? "Edit & Start Study" : "Configure Study"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="study-name">Study Name *</Label>
                  <Input
                    id="study-name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Morning Lobby Congestion"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Planned Duration</Label>
                  <select
                    id="duration"
                    value={form.duration_minutes ?? ""}
                    onChange={e => setForm(f => ({
                      ...f,
                      duration_minutes: e.target.value ? parseInt(e.target.value) : null,
                    }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select a duration…</option>
                    {DURATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="study-goal">Study Goal</Label>
                <Textarea
                  id="study-goal"
                  value={form.study_goal}
                  onChange={e => setForm(f => ({ ...f, study_goal: e.target.value }))}
                  placeholder="What do you want to find out? e.g., Monitor the main entrance for congestion patterns between 8–9am."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {zones.length > 0 && (
                <div className="space-y-2">
                  <Label>Target Zones</Label>
                  <p className="text-xs text-muted-foreground">
                    Select which zones this study should focus on. Leave blank to include all zones.
                  </p>
                  <ScrollArea className="h-[130px] rounded border border-border p-3">
                    <div className="space-y-2">
                      {zones.map(zone => (
                        <div key={zone.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`zone-${zone.id}`}
                            checked={form.target_zones.includes(zone.id)}
                            onCheckedChange={() => toggleZone(zone.id)}
                          />
                          <label
                            htmlFor={`zone-${zone.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {zone.name}
                            {zone.zone_type && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({zone.zone_type.replace(/_/g, " ")})
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {metrics.length > 0 && (
                <div className="space-y-2">
                  <Label>Metrics to Track</Label>
                  <p className="text-xs text-muted-foreground">
                    Selected metrics guide what the behavior monitoring and insights agents prioritize.
                  </p>
                  <ScrollArea className="h-[130px] rounded border border-border p-3">
                    <div className="space-y-2">
                      {metrics.map(metric => (
                        <div key={metric.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`metric-${metric.id}`}
                            checked={form.target_metrics.includes(metric.id)}
                            onCheckedChange={() => toggleMetric(metric.id)}
                          />
                          <label
                            htmlFor={`metric-${metric.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {metric.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({metric.category.replace(/_/g, " ")})
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* AI response feedback */}
              {lastResponse && (
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-lg text-sm",
                  lastResponse.action_type === "start_study"
                    ? "bg-success/10 text-foreground"
                    : "bg-secondary/50 text-foreground"
                )}>
                  <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p>{lastResponse.assistant_response_text}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.name.trim() || isSubmitting} className="gap-2">
                  {isSubmitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? "Sending…" : editingStudy ? "Update & Start" : "Start Study"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Studies list */}
      {studies.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FlaskConical className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Studies Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Click <strong>New Study</strong> above to configure and launch your first study.
              The AI agents will handle planning, behavior monitoring, and insights automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {studies.map(study => {
            const stage = STATUS_CONFIG[study.status] ?? {
              label: study.status,
              color: "bg-muted text-muted-foreground",
            }
            return (
              <Card key={study.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                      {study.study_goal}
                    </p>
                    <Badge className={cn(stage.color, "shrink-0 text-xs")}>{stage.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono" title={study.study_id}>
                      {study.study_id.slice(0, 18)}…
                    </span>
                    <span>{formatDistanceToNow(new Date(study.created_at), { addSuffix: true })}</span>
                  </div>
                  {study.live_preview_status && (
                    <p className="text-xs text-muted-foreground">
                      Preview: {study.live_preview_status}
                    </p>
                  )}
                  {study.started_at && (
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(study.started_at).toLocaleDateString()}
                      {study.duration_seconds && ` · ${formatDuration(Math.round(study.duration_seconds / 60))}`}
                    </p>
                  )}
                  {study.current_stage === "draft" && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs"
                        onClick={() => handleEditStudy(study)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit & Start
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const days = Math.floor(minutes / 1440)
  const weeks = Math.floor(days / 7)
  const rem = days % 7
  if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`
  return weeks > 0 ? `${weeks}w` : `${days}d`
}
