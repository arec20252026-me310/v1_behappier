"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, FlaskConical, Play, Pause, CheckCircle, Clock, MoreVertical } from "lucide-react"
import type { Space, Study, Zone, Metric } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { CreateStudyDialog } from "./create-study-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"

interface StudiesManagerProps {
  space: Space | null
  initialStudies: Study[]
  zones: Zone[]
  metrics: Metric[]
}

const statusConfig = {
  draft: { label: "Draft", icon: Clock, color: "bg-muted text-muted-foreground" },
  active: { label: "Active", icon: Play, color: "bg-success/20 text-success" },
  paused: { label: "Paused", icon: Pause, color: "bg-warning/20 text-warning" },
  completed: { label: "Completed", icon: CheckCircle, color: "bg-primary/20 text-primary" },
}

export function StudiesManager({ space, initialStudies, zones, metrics }: StudiesManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [studies, setStudies] = useState<Study[]>(initialStudies)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
          <Button onClick={() => router.push('/dashboard/space')}>
            Set Up Space
          </Button>
        </CardContent>
      </Card>
    )
  }

  const updateStudyStatus = async (studyId: string, status: Study['status']) => {
    const updates: Partial<Study> = { status }
    
    if (status === 'active' && !studies.find(s => s.id === studyId)?.start_time) {
      updates.start_time = new Date().toISOString()
    }
    if (status === 'completed') {
      updates.end_time = new Date().toISOString()
    }

    const { error } = await supabase
      .from('studies')
      .update(updates)
      .eq('id', studyId)

    if (!error) {
      setStudies(studies.map(s => 
        s.id === studyId ? { ...s, ...updates } : s
      ))
    }
  }

  const deleteStudy = async (studyId: string) => {
    const { error } = await supabase
      .from('studies')
      .delete()
      .eq('id', studyId)

    if (!error) {
      setStudies(studies.filter(s => s.id !== studyId))
    }
  }

  const handleStudyCreated = (study: Study) => {
    setStudies([study, ...studies])
    setShowCreateDialog(false)
  }

  const getZoneNames = (zoneIds: string[]) => 
    zoneIds.map(id => zones.find(z => z.id === id)?.name || 'Unknown').join(', ')

  const getMetricNames = (metricIds: string[]) => 
    metricIds.map(id => metrics.find(m => m.id === id)?.name || 'Unknown').join(', ')

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return 'Not set'
    
    if (minutes < 60) {
      return `${minutes}m`
    }
    
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    
    const days = Math.floor(minutes / 1440)
    const weeks = Math.floor(days / 7)
    const remainingDays = days % 7
    
    if (weeks > 0 && remainingDays > 0) {
      return `${weeks}w ${remainingDays}d`
    } else if (weeks > 0) {
      return `${weeks}w`
    } else {
      return `${days}d`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Micro-Studies</h2>
          <p className="text-sm text-muted-foreground">
            {studies.filter(s => s.status === 'active').length} active studies
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Study
        </Button>
      </div>

      {studies.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FlaskConical className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Studies Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Micro-studies help you test specific hypotheses about your space. 
              Create one to start collecting focused behavioral data.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Study
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {studies.map((study) => {
            const status = statusConfig[study.status]
            const StatusIcon = status.icon

            return (
              <Card key={study.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base font-medium truncate">
                          {study.name}
                        </CardTitle>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      {study.hypothesis && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {study.hypothesis}
                        </p>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {study.status === 'draft' && (
                          <DropdownMenuItem onClick={() => updateStudyStatus(study.id, 'active')}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Study
                          </DropdownMenuItem>
                        )}
                        {study.status === 'active' && (
                          <>
                            <DropdownMenuItem onClick={() => updateStudyStatus(study.id, 'paused')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Study
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStudyStatus(study.id, 'completed')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete Study
                            </DropdownMenuItem>
                          </>
                        )}
                        {study.status === 'paused' && (
                          <DropdownMenuItem onClick={() => updateStudyStatus(study.id, 'active')}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume Study
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteStudy(study.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete Study
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {study.target_zones.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Target Zones</p>
                      <p className="text-sm text-foreground">{getZoneNames(study.target_zones)}</p>
                    </div>
                  )}
                  
                  {study.target_metrics.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Tracked Metrics</p>
                      <p className="text-sm text-foreground">{getMetricNames(study.target_metrics)}</p>
                    </div>
                  )}

                  {study.planned_duration_minutes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Planned Duration</p>
                      <p className="text-sm text-foreground">{formatDuration(study.planned_duration_minutes)}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                    <span>
                      Created {formatDistanceToNow(new Date(study.created_at), { addSuffix: true })}
                    </span>
                    {study.start_time && (
                      <span>
                        Started {formatDistanceToNow(new Date(study.start_time), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CreateStudyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        spaceId={space.id}
        zones={zones}
        metrics={metrics}
        onStudyCreated={handleStudyCreated}
      />
    </div>
  )
}
