"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LiveDetectionFeed, type DetectionRow } from "@/components/studies/live-detection-feed"

interface StudyEntry {
  studyId: string
  status: string
  studyName?: string
}

interface LatestDetectionCardProps {
  // Legacy single-study (demo mode)
  studyId?: string
  status?: string
  demoDetections?: DetectionRow[]
  // Multi-study (real mode)
  studies?: StudyEntry[]
}

export function LatestDetectionCard({ studyId, status, demoDetections, studies }: LatestDetectionCardProps) {
  const allStudies: StudyEntry[] = studies && studies.length > 0
    ? studies
    : studyId ? [{ studyId, status: status ?? "running" }] : []

  if (allStudies.length === 0) return null

  return (
    <Card className="bg-card border-border pt-2 pb-4">
      <CardHeader className="pb-1.5 flex flex-row items-center gap-2">
        <CardTitle className="text-base font-medium">Latest Detection</CardTitle>
        <Badge variant="outline" className="text-xs text-green-700 dark:text-green-400 border-green-600/50 dark:border-green-500/50 bg-green-500/10">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse mr-1" />
          {allStudies.length > 1 ? `Running ×${allStudies.length}` : "Running"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {allStudies.map((s, idx) => (
          <div key={s.studyId} className={idx > 0 ? "pt-4 border-t border-border" : ""}>
            {allStudies.length > 1 && (
              <p className="text-xs text-muted-foreground/60 mb-1.5 truncate">
                Study {idx + 1}: {s.studyName ?? s.studyId}
              </p>
            )}
            <LiveDetectionFeed
              studyId={s.studyId}
              status={s.status}
              limit={1}
              demoDetections={idx === 0 ? demoDetections : undefined}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
