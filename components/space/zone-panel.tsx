"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, MapPin, Camera, X } from "lucide-react"
import type { Zone, Camera as CameraType, HACameraMapping } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ZONE_TYPES } from "@/lib/types"

const CAMERA_OPTIONS = [
  { id: "camera_1", label: "camera_1" },
  { id: "camera_2", label: "camera_2" },
  { id: "camera_3", label: "camera_3" },
]

interface ZonePanelProps {
  zone: Zone | null
  onUpdate: (zone: Zone) => void
  onDelete: (zoneId: string) => void
  onAssignCamera?: (zoneId: string, haCamera: HACameraMapping) => void
  onRemoveCamera?: (zoneId: string) => void
  assignedCamera?: CameraType | null
  haCameras?: HACameraMapping[]
  saving: boolean
  gridResolution?: number
}

export function ZonePanel({
  zone,
  onUpdate,
  onDelete,
  onAssignCamera,
  onRemoveCamera,
  assignedCamera,
  haCameras: _haCameras = [],
  saving,
  gridResolution = 8,
}: ZonePanelProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const sizeOptions = Array.from({ length: gridResolution }, (_, i) => i + 1)

  if (!zone) {
    return (
      <Card className="bg-card border-border h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Select a zone to view and edit its properties
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleChange = (field: keyof Zone, value: string | number) => {
    const updates: Partial<Zone> = { [field]: value }
    if (field === "zone_type") {
      const zoneType = ZONE_TYPES.find(t => t.value === value)
      if (zoneType) updates.color = zoneType.color
    }
    onUpdate({ ...zone, ...updates })
  }

  const handleAssign = () => {
    if (!selectedCameraId || !onAssignCamera) return
    const opt = CAMERA_OPTIONS.find(c => c.id === selectedCameraId)
    if (!opt) return
    // Construct a minimal HACameraMapping; id is a nil UUID so the ha_camera_mappings
    // link step in the editor is a no-op — the cameras record is what matters.
    const haCamera: HACameraMapping = {
      id: "00000000-0000-0000-0000-000000000000",
      camera_id: null,
      ha_entity_id: opt.id,
      ha_friendly_name: opt.label,
      ha_device_class: null,
      snapshot_interval_seconds: null,
      is_active: true,
      last_snapshot_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onAssignCamera(zone.id, haCamera)
    setSelectedCameraId("")
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Zone Properties</CardTitle>
        {saving && (
          <Badge variant="secondary" className="text-xs">Saving...</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zoneName">Name</Label>
          <Input
            id="zoneName"
            value={zone.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Zone name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zoneType">Type</Label>
          <Select
            value={zone.zone_type || "other"}
            onValueChange={(value) => handleChange("zone_type", value)}
          >
            <SelectTrigger id="zoneType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="gridWidth">Width</Label>
            <Select
              value={String(zone.grid_width)}
              onValueChange={(value) => handleChange("grid_width", parseInt(value))}
            >
              <SelectTrigger id="gridWidth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} cell{n > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gridHeight">Height</Label>
            <Select
              value={String(zone.grid_height)}
              onValueChange={(value) => handleChange("grid_height", parseInt(value))}
            >
              <SelectTrigger id="gridHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} cell{n > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Camera assignment section */}
        <div className="pt-2 space-y-2">
          <Label className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            Camera
          </Label>

          {assignedCamera ? (
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{assignedCamera.name}</p>
                {!!assignedCamera.metadata?.ha_entity_id && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {String(assignedCamera.metadata.ha_entity_id)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveCamera?.(zone.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Assign a camera…" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_OPTIONS.map((cam) => (
                    <SelectItem key={cam.id} value={cam.id}>
                      {cam.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedCameraId}
                onClick={handleAssign}
              >
                Assign
              </Button>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onDelete(zone.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Zone
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
