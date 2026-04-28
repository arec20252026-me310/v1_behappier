"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Trash2, MapPin } from "lucide-react"
import type { Zone } from "@/lib/types"
import { ZONE_TYPES } from "@/lib/types"

interface ZonePanelProps {
  zone: Zone | null
  onUpdate: (zone: Zone) => void
  onDelete: (zoneId: string) => void
  saving: boolean
  gridResolution?: number
}

export function ZonePanel({ zone, onUpdate, onDelete, saving, gridResolution = 8 }: ZonePanelProps) {
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
    let updates: Partial<Zone> = { [field]: value }
    
    // Update color when zone type changes
    if (field === 'zone_type') {
      const zoneType = ZONE_TYPES.find(t => t.value === value)
      if (zoneType) {
        updates.color = zoneType.color
      }
    }
    
    onUpdate({ ...zone, ...updates })
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
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Zone name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zoneType">Type</Label>
          <Select
            value={zone.zone_type || 'other'}
            onValueChange={(value) => handleChange('zone_type', value)}
          >
            <SelectTrigger id="zoneType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <div className="flex items-center gap-3">
            <Slider
              id="capacity"
              value={[zone.capacity || 10]}
              onValueChange={([value]) => handleChange('capacity', value)}
              min={1}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-8 text-right">
              {zone.capacity || 10}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="gridWidth">Width</Label>
            <Select
              value={String(zone.grid_width)}
              onValueChange={(value) => handleChange('grid_width', parseInt(value))}
            >
              <SelectTrigger id="gridWidth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} cell{n > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gridHeight">Height</Label>
            <Select
              value={String(zone.grid_height)}
              onValueChange={(value) => handleChange('grid_height', parseInt(value))}
            >
              <SelectTrigger id="gridHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} cell{n > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
