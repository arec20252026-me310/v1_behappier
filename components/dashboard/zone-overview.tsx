"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MapPin } from "lucide-react"
import type { Zone } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ZoneOverviewProps {
  zones: Zone[]
}

export function ZoneOverview({ zones }: ZoneOverviewProps) {
  if (zones.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Zone Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No zones configured yet
            </p>
            <Link href="/dashboard/space">
              <Button size="sm">Set Up Space</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Zone Overview</CardTitle>
        <Link href="/dashboard/space">
          <Button variant="ghost" size="sm" className="text-xs">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {zones.slice(0, 5).map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{zone.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {zone.zone_type?.replace("_", " ") || "Uncategorized"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {zone.capacity && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {zone.capacity}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
