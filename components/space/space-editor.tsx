"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Save, Settings, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Space, Zone, Camera, CameraPlacement, CameraDirection, HACameraMapping } from "@/lib/types"
import { ZONE_TYPES } from "@/lib/types"
import { ZoneGrid } from "./zone-grid"
import { ZonePanel } from "./zone-panel"
import { SpaceSetupDialog } from "./space-setup-dialog"

interface SpaceEditorProps {
  space: Space | null
  initialZones: Zone[]
  initialCameras: Camera[]
  haCameras: HACameraMapping[]
  allSpaces?: Space[]
  demo?: boolean
}

export function SpaceEditor({ space, initialZones, initialCameras, haCameras, allSpaces = [], demo = false }: SpaceEditorProps) {
  const router = useRouter()
  const supabase = createClient()

  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [cameras, setCameras] = useState<Camera[]>(initialCameras)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(!space)
  const [currentSpace, setCurrentSpace] = useState<Space | null>(space)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle")

  const [cameraPlacments, setCameraPlacments] = useState<CameraPlacement[]>(() => {
    const cellSize = Math.max(30, Math.min(60, 480 / (space?.grid_resolution || 8)))
    return initialCameras
      .filter(cam => initialZones.some(z => z.id === cam.zone_id))
      .map(cam => {
        const zone = initialZones.find(z => z.id === cam.zone_id)!
        const meta = cam.metadata ?? {}
        return {
          id: `cam-${cam.zone_id}`,
          zoneId: cam.zone_id,
          x: typeof meta.placement_x === "number" ? meta.placement_x : (zone.grid_x + zone.grid_width / 2) * cellSize,
          y: typeof meta.placement_y === "number" ? meta.placement_y : (zone.grid_y + zone.grid_height / 2) * cellSize,
          fracX: typeof meta.placement_frac_x === "number" ? meta.placement_frac_x : undefined,
          fracY: typeof meta.placement_frac_y === "number" ? meta.placement_frac_y : undefined,
          direction: (typeof meta.placement_direction === "string" ? meta.placement_direction : "down") as CameraDirection,
          label: cam.name,
        }
      })
  })

  const handleSpaceCreated = (newSpace: Space) => {
    setCurrentSpace(newSpace)
    setShowSetupDialog(false)
    router.push(`/dashboard/space?space_id=${newSpace.id}`)
  }

  const addZone = useCallback(async () => {
    if (!currentSpace) return

    const gridRes = currentSpace.grid_resolution || 8
    let foundSpot = false
    let gridX = 0
    let gridY = 0

    for (let y = 0; y < gridRes && !foundSpot; y++) {
      for (let x = 0; x < gridRes && !foundSpot; x++) {
        const isOccupied = zones.some(
          z =>
            x >= z.grid_x &&
            x < z.grid_x + z.grid_width &&
            y >= z.grid_y &&
            y < z.grid_y + z.grid_height
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
      zone_type: "workspace",
      grid_x: gridX,
      grid_y: gridY,
      grid_width: 2,
      grid_height: 2,
      color: ZONE_TYPES.find(t => t.value === "workspace")?.color || "#3B82F6",
    }

    const { data, error } = await supabase.from("zones").insert(newZone).select().single()
    if (data && !error) {
      setZones([...zones, data])
      setSelectedZone(data)
    }
  }, [currentSpace, zones, supabase])

  const updateZone = useCallback(
    async (updatedZone: Zone) => {
      setSaving(true)
      const { error } = await supabase
        .from("zones")
        .update({
          name: updatedZone.name,
          zone_type: updatedZone.zone_type,
          grid_x: updatedZone.grid_x,
          grid_y: updatedZone.grid_y,
          grid_width: updatedZone.grid_width,
          grid_height: updatedZone.grid_height,
          color: updatedZone.color,
        })
        .eq("id", updatedZone.id)

      if (!error) {
        setZones(zones.map(z => (z.id === updatedZone.id ? updatedZone : z)))
        setSelectedZone(updatedZone)
      }
      setSaving(false)
    },
    [zones, supabase]
  )

  const deleteZone = useCallback(
    async (zoneId: string) => {
      // Remove camera assignment for this zone first
      const cam = cameras.find(c => c.zone_id === zoneId)
      if (cam) {
        await supabase.from("ha_camera_mappings").update({ camera_id: null }).eq("camera_id", cam.id)
        await supabase.from("cameras").delete().eq("id", cam.id)
        setCameras(prev => prev.filter(c => c.zone_id !== zoneId))
        setCameraPlacments(prev => prev.filter(p => p.zoneId !== zoneId))
      }

      const { error } = await supabase.from("zones").delete().eq("id", zoneId)
      if (!error) {
        setZones(zones.filter(z => z.id !== zoneId))
        if (selectedZone?.id === zoneId) setSelectedZone(null)
      }
    },
    [zones, cameras, selectedZone, supabase]
  )

  const handleAssignCamera = useCallback(
    async (zoneId: string, haCamera: HACameraMapping) => {
      if (!currentSpace) return
      const zone = zones.find(z => z.id === zoneId)
      if (!zone) return

      // Remove any existing camera for this zone
      const existing = cameras.find(c => c.zone_id === zoneId)
      if (existing) {
        await supabase.from("ha_camera_mappings").update({ camera_id: null }).eq("camera_id", existing.id)
        await supabase.from("cameras").delete().eq("id", existing.id)
      }

      const cellSize = Math.max(30, Math.min(60, 480 / (currentSpace.grid_resolution || 8)))
      const initialX = (zone.grid_x + zone.grid_width / 2) * cellSize
      const initialY = (zone.grid_y + zone.grid_height / 2) * cellSize

      // Create real cameras record, persisting initial placement in metadata
      const { data: newCamera, error } = await supabase
        .from("cameras")
        .insert({
          zone_id: zoneId,
          name: haCamera.ha_friendly_name || haCamera.ha_entity_id,
          stream_url: null,
          status: "active",
          field_of_view: {},
          metadata: {
            ha_entity_id: haCamera.ha_entity_id,
            placement_x: initialX,
            placement_y: initialY,
            placement_direction: "down",
          },
        })
        .select()
        .single()

      if (error || !newCamera) return

      // Link ha_camera_mappings → cameras
      await supabase
        .from("ha_camera_mappings")
        .update({ camera_id: newCamera.id })
        .eq("id", haCamera.id)

      setCameras(prev => [...prev.filter(c => c.zone_id !== zoneId), newCamera])
      setCameraPlacments(prev => [
        ...prev.filter(p => p.zoneId !== zoneId),
        { id: `cam-${zoneId}`, zoneId, x: initialX, y: initialY, direction: "down", label: haCamera.ha_friendly_name || haCamera.ha_entity_id },
      ])
    },
    [zones, cameras, currentSpace, supabase]
  )

  const handleUpdateCameras = useCallback(
    async (newPlacements: CameraPlacement[]) => {
      const directionChanged = newPlacements.some(np => {
        const old = cameraPlacments.find(op => op.id === np.id)
        return old && old.direction !== np.direction
      })
      setCameraPlacments(newPlacements)
      if (directionChanged) {
        for (const p of newPlacements) {
          const cam = cameras.find(c => c.zone_id === p.zoneId)
          if (!cam) continue
          await supabase.from("cameras").update({
            metadata: { ...cam.metadata, placement_x: p.x, placement_y: p.y, placement_frac_x: p.fracX, placement_frac_y: p.fracY, placement_direction: p.direction },
          }).eq("id", cam.id)
        }
      }
    },
    [cameraPlacments, cameras, supabase]
  )

  const handleRemoveCamera = useCallback(
    async (zoneId: string) => {
      const existing = cameras.find(c => c.zone_id === zoneId)
      if (!existing) return

      await supabase.from("ha_camera_mappings").update({ camera_id: null }).eq("camera_id", existing.id)
      await supabase.from("cameras").delete().eq("id", existing.id)

      setCameras(prev => prev.filter(c => c.zone_id !== zoneId))
      setCameraPlacments(prev => prev.filter(p => p.zoneId !== zoneId))
    },
    [cameras, supabase]
  )

  const saveAllZones = useCallback(async () => {
    setSaveStatus("saving")
    try {
      for (const zone of zones) {
        await supabase
          .from("zones")
          .update({
            name: zone.name,
            zone_type: zone.zone_type,
            grid_x: zone.grid_x,
            grid_y: zone.grid_y,
            grid_width: zone.grid_width,
            grid_height: zone.grid_height,
            color: zone.color,
          })
          .eq("id", zone.id)
      }
      for (const p of cameraPlacments) {
        const cam = cameras.find(c => c.zone_id === p.zoneId)
        if (!cam) continue
        await supabase.from("cameras").update({
          metadata: { ...cam.metadata, placement_x: p.x, placement_y: p.y, placement_frac_x: p.fracX, placement_frac_y: p.fracY, placement_direction: p.direction },
        }).eq("id", cam.id)
      }
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("idle")
    }
  }, [zones, cameras, cameraPlacments, supabase])

  if (!currentSpace) {
    return (
      <SpaceSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        onSpaceCreated={handleSpaceCreated}
      />
    )
  }

  const assignedCamera = selectedZone
    ? cameras.find(c => c.zone_id === selectedZone.id) ?? null
    : null

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Space switcher bar */}
      {allSpaces.length > 0 && (
        <div className="flex items-center gap-3">
          <Select
            value={currentSpace?.id ?? undefined}
            onValueChange={(id) => router.push(`/dashboard/space?space_id=${id}`)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a space…" />
            </SelectTrigger>
            <SelectContent>
              {allSpaces.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/space?new=1")}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Space
          </Button>
        </div>
      )}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
      <div className="lg:col-span-2">
        <Card className="bg-card border-border h-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">{currentSpace.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentSpace.building_type ? `${currentSpace.building_type} · ` : ""}
                {zones.length} zones · {cameras.length} camera{cameras.length !== 1 ? "s" : ""} assigned
                {currentSpace.grid_resolution && ` · ${currentSpace.grid_resolution}×${currentSpace.grid_resolution} grid`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSetupDialog(true)}>
                {currentSpace.floor_plan_url ? (
                  <><Settings className="h-4 w-4 mr-2" />Settings</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload Plan</>
                )}
              </Button>
              <Button
                variant={saveStatus === "success" ? "default" : "secondary"}
                size="sm"
                onClick={saveAllZones}
                disabled={saveStatus === "saving"}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveStatus === "saving" ? "Saving…" : saveStatus === "success" ? "Saved!" : "Save All"}
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
              onUpdateCameras={handleUpdateCameras}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <ZonePanel
          zone={selectedZone}
          onUpdate={updateZone}
          onDelete={deleteZone}
          onAssignCamera={handleAssignCamera}
          onRemoveCamera={handleRemoveCamera}
          assignedCamera={assignedCamera}
          haCameras={haCameras}
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
    </div>
  )
}
