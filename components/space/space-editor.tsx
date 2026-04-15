"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Save, Trash2, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Space, Zone, Camera } from "@/lib/types"
import { ZONE_TYPES } from "@/lib/types"
import { ZoneGrid } from "./zone-grid"
import { ZonePanel } from "./zone-panel"
import { SpaceSetupDialog } from "./space-setup-dialog"

interface SpaceEditorProps {
  space: Space | null
  initialZones: Zone[]
  cameras: Camera[]
}

export function SpaceEditor({ space, initialZones, cameras }: SpaceEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(!space)
  const [currentSpace, setCurrentSpace] = useState<Space | null>(space)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')

  const handleSpaceCreated = (newSpace: Space) => {
    setCurrentSpace(newSpace)
    setShowSetupDialog(false)
    router.refresh()
  }

  const addZone = useCallback(async () => {
    if (!currentSpace) return

    const newZone: Partial<Zone> = {
      space_id: currentSpace.id,
      name: `Zone ${zones.length + 1}`,
      zone_type: 'workspace',
      grid_x: 0,
      grid_y: zones.length,
      grid_width: 2,
      grid_height: 1,
      color: ZONE_TYPES.find(t => t.value === 'workspace')?.color || '#3B82F6',
      capacity: 10,
    }

    const { data, error } = await supabase
      .from('zones')
      .insert(newZone)
      .select()
      .single()

    if (data && !error) {
      setZones([...zones, data])
      setSelectedZone(data)
    }
  }, [currentSpace, zones, supabase])

  const updateZone = useCallback(async (updatedZone: Zone) => {
    setSaving(true)
    const { error } = await supabase
      .from('zones')
      .update({
        name: updatedZone.name,
        zone_type: updatedZone.zone_type,
        grid_x: updatedZone.grid_x,
        grid_y: updatedZone.grid_y,
        grid_width: updatedZone.grid_width,
        grid_height: updatedZone.grid_height,
        color: updatedZone.color,
        capacity: updatedZone.capacity,
      })
      .eq('id', updatedZone.id)

    if (!error) {
      setZones(zones.map(z => z.id === updatedZone.id ? updatedZone : z))
      setSelectedZone(updatedZone)
    }
    setSaving(false)
  }, [zones, supabase])

  const deleteZone = useCallback(async (zoneId: string) => {
    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', zoneId)

    if (!error) {
      setZones(zones.filter(z => z.id !== zoneId))
      if (selectedZone?.id === zoneId) {
        setSelectedZone(null)
      }
    }
  }, [zones, selectedZone, supabase])

  const saveAllZones = useCallback(async () => {
    setSaveStatus('saving')
    try {
      // Save all zones sequentially
      for (const zone of zones) {
        await supabase
          .from('zones')
          .update({
            name: zone.name,
            zone_type: zone.zone_type,
            grid_x: zone.grid_x,
            grid_y: zone.grid_y,
            grid_width: zone.grid_width,
            grid_height: zone.grid_height,
            color: zone.color,
            capacity: zone.capacity,
          })
          .eq('id', zone.id)
      }
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving zones:', error)
      setSaveStatus('idle')
    }
  }, [zones, supabase])

  if (!currentSpace) {
    return (
      <SpaceSetupDialog 
        open={showSetupDialog} 
        onOpenChange={setShowSetupDialog}
        onSpaceCreated={handleSpaceCreated}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2">
        <Card className="bg-card border-border h-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">{currentSpace.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentSpace.building_type ? `${currentSpace.building_type} - ` : ''} 
                {zones.length} zones configured
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSetupDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant={saveStatus === 'success' ? 'default' : 'secondary'}
                size="sm" 
                onClick={saveAllZones}
                disabled={saveStatus === 'saving'}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save All'}
              </Button>
              <Button size="sm" onClick={addZone}>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ZoneGrid 
              zones={zones}
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
              onUpdateZone={updateZone}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <ZonePanel 
          zone={selectedZone}
          cameras={cameras.filter(c => c.zone_id === selectedZone?.id)}
          onUpdate={updateZone}
          onDelete={deleteZone}
          saving={saving}
        />
      </div>

      <SpaceSetupDialog 
        open={showSetupDialog && !!currentSpace} 
        onOpenChange={setShowSetupDialog}
        onSpaceCreated={handleSpaceCreated}
        existingSpace={currentSpace}
      />
    </div>
  )
}
