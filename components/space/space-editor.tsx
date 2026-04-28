"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Save, Settings, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Space, Zone, CameraPlacement } from "@/lib/types"
import { ZONE_TYPES } from "@/lib/types"
import { ZoneGrid } from "./zone-grid"
import { ZonePanel } from "./zone-panel"
import { SpaceSetupDialog } from "./space-setup-dialog"

interface SpaceEditorProps {
  space: Space | null
  initialZones: Zone[]
}

export function SpaceEditor({ space, initialZones }: SpaceEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(!space)
  const [currentSpace, setCurrentSpace] = useState<Space | null>(space)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')
  const CAMERA_STORAGE_KEY = `camera-placements-${space?.id ?? 'default'}`

  const [cameraPlacments, setCameraPlacments] = useState<CameraPlacement[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(`camera-placements-${space?.id ?? 'default'}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(cameraPlacments))
    } catch {}
  }, [cameraPlacments, CAMERA_STORAGE_KEY])

  const handleSpaceCreated = (newSpace: Space) => {
    setCurrentSpace(newSpace)
    setShowSetupDialog(false)
    router.refresh()
  }

  const addZone = useCallback(async () => {
    if (!currentSpace) return

    // Find a free spot on the grid
    const gridRes = currentSpace.grid_resolution || 8
    let foundSpot = false
    let gridX = 0
    let gridY = 0

    for (let y = 0; y < gridRes && !foundSpot; y++) {
      for (let x = 0; x < gridRes && !foundSpot; x++) {
        const isOccupied = zones.some(z => 
          x >= z.grid_x && x < z.grid_x + z.grid_width &&
          y >= z.grid_y && y < z.grid_y + z.grid_height
        )
        if (!isOccupied) {
          gridX = x
          gridY = y
          foundSpot = true
        }
      }
    }

    const newZone: Partial<Zone> = {
      space_id: currentSpace.id,
      name: `Zone ${zones.length + 1}`,
      zone_type: 'workspace',
      grid_x: gridX,
      grid_y: gridY,
      grid_width: 2,
      grid_height: 2,
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
                {currentSpace.grid_resolution && ` • ${currentSpace.grid_resolution}x${currentSpace.grid_resolution} grid`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSetupDialog(true)}>
                {currentSpace.floor_plan_url ? (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Plan
                  </>
                )}
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
              floorPlanUrl={currentSpace.floor_plan_url}
              gridResolution={currentSpace.grid_resolution || 8}
              cameras={cameraPlacments}
              onUpdateCameras={setCameraPlacments}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <ZonePanel 
          zone={selectedZone}
          onUpdate={updateZone}
          onDelete={deleteZone}
          saving={saving}
          gridResolution={currentSpace.grid_resolution || 8}
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
