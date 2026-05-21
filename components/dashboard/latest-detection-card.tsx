"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LiveDetectionFeed, type DetectionRow } from "@/components/studies/live-detection-feed"

interface LatestDetectionCardProps {
  studyId: string
  status: string
  demoDetections?: DetectionRow[]
}

export function LatestDetectionCard({ studyId, status, demoDetections }: LatestDetectionCardProps) {
  return (
    <Card className="bg-card border-border pt-2 pb-4">
      <CardHeader className="pb-1.5 flex flex-row items-center gap-2">
        <CardTitle className="text-base font-medium">Latest Detection</CardTitle>
        <Badge variant="outline" className="text-xs text-green-400 border-green-500/50 bg-green-500/10">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1" />
          Running
        </Badge>
      </CardHeader>
      <CardContent>
        <LiveDetectionFeed studyId={studyId} status={status} limit={4} demoDetections={demoDetections} />
      </CardContent>
    </Card>
  )
}
