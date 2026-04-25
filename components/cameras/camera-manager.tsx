"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Camera, Link2, Unlink, Eye, Clock, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Zone } from "@/lib/types"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface HACameraMapping {
  id: string
  ha_entity_id: string
  ha_friendly_name: string
  camera_id: string | null
  is_active: boolean
  last_snapshot_at: string | null
  created_at: string
}

interface CameraSnapshot {
  id: string
  ha_entity_id: string
  storage_path: string
  captured_at: string
  file_size: number
}

// Generate public URL from storage path
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
function getPublicUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/camera-snapshots/${storagePath}`
}

interface CameraManagerProps {
  cameras: HACameraMapping[]
  snapshots: CameraSnapshot[]
  zones: Zone[]
  loading: boolean
  onUpdateCamera: (cameraId: string, updates: Partial<HACameraMapping>) => Promise<void>
}

export function CameraManager({
  cameras,
  snapshots,
  zones,
  loading,
  onUpdateCamera,
}: CameraManagerProps) {
  const [selectedCamera, setSelectedCamera] = useState<HACameraMapping | null>(null)
  const [viewingSnapshot, setViewingSnapshot] = useState<CameraSnapshot | null>(null)
  const [linkingCamera, setLinkingCamera] = useState<string | null>(null)

  const getLatestSnapshot = (entityId: string) => {
    return snapshots.find((s) => s.ha_entity_id === entityId)
  }

  const getCameraSnapshots = (entityId: string) => {
    return snapshots.filter((s) => s.ha_entity_id === entityId)
  }

  const getLinkedZone = (cameraId: string | null) => {
    if (!cameraId) return null
    return zones.find((z) => z.id === cameraId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading cameras...</p>
        </div>
      </div>
    )
  }

  if (cameras.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Cameras Connected</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            Set up your Home Assistant automation to start sending camera snapshots. 
            Cameras will appear here automatically once they send their first snapshot.
          </p>
          <div className="text-xs text-muted-foreground bg-secondary/50 p-4 rounded-lg font-mono max-w-lg">
            <p className="mb-2">Webhook endpoint:</p>
            <code className="text-primary break-all">
              https://nxjgwifaolhdlcaoljsb.supabase.co/functions/v1/home-assistant-webhook
            </code>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Tabs defaultValue="cameras" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cameras" className="gap-2">
            <Camera className="h-4 w-4" />
            Cameras ({cameras.length})
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Recent Snapshots ({snapshots.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cameras" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map((camera) => {
              const latestSnapshot = getLatestSnapshot(camera.ha_entity_id)
              const linkedZone = getLinkedZone(camera.camera_id)

              return (
                <Card
                  key={camera.id}
                  className={cn(
                    "bg-card border-border overflow-hidden cursor-pointer transition-all hover:border-primary/50",
                    selectedCamera?.id === camera.id && "border-primary"
                  )}
                  onClick={() => setSelectedCamera(camera)}
                >
                  {/* Snapshot Preview */}
                  <div className="aspect-video bg-secondary/50 relative">
                    {latestSnapshot ? (
                      <Image
                        src={getPublicUrl(latestSnapshot.storage_path)}
                        alt={camera.ha_friendly_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Status indicator */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={camera.is_active ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          camera.is_active ? "bg-success text-success-foreground" : ""
                        )}
                      >
                        {camera.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-sm">{camera.ha_friendly_name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          {camera.ha_entity_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      {camera.last_snapshot_at
                        ? `Last snapshot ${formatDistanceToNow(new Date(camera.last_snapshot_at), { addSuffix: true })}`
                        : "No snapshots yet"}
                    </div>

                    {/* Zone Link Status */}
                    <div className="flex items-center justify-between">
                      {linkedZone ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-xs">Linked to {linkedZone.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Not linked to a zone</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLinkingCamera(camera.id)
                        }}
                      >
                        {linkedZone ? (
                          <>
                            <Unlink className="h-3 w-3 mr-1" />
                            Change
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            Link
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-4">
          {snapshots.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No snapshots captured yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {snapshots.map((snapshot) => {
                const camera = cameras.find((c) => c.ha_entity_id === snapshot.ha_entity_id)
                return (
                  <Card
                    key={snapshot.id}
                    className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => setViewingSnapshot(snapshot)}
                  >
                    <div className="aspect-video relative">
                      <Image
                        src={getPublicUrl(snapshot.storage_path)}
                        alt={`Snapshot from ${camera?.ha_friendly_name || "camera"}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-1 left-1 right-1">
                        <p className="text-[10px] text-white truncate">
                          {camera?.ha_friendly_name}
                        </p>
                        <p className="text-[9px] text-white/70">
                          {formatDistanceToNow(new Date(snapshot.captured_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Link Camera to Zone Dialog */}
      <Dialog open={!!linkingCamera} onOpenChange={() => setLinkingCamera(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Camera to Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a zone to link this camera to. The camera will be associated with the selected zone for occupancy tracking.
            </p>
            {zones.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No zones available</p>
                <p className="text-xs text-muted-foreground">
                  Create zones in the Space Editor first
                </p>
              </div>
            ) : (
              <Select
                onValueChange={async (value) => {
                  if (linkingCamera) {
                    await onUpdateCamera(linkingCamera, {
                      camera_id: value === "none" ? null : value,
                    })
                    setLinkingCamera(null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No zone (unlink)</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name} ({zone.zone_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Snapshot Dialog */}
      <Dialog open={!!viewingSnapshot} onOpenChange={() => setViewingSnapshot(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Snapshot Details
            </DialogTitle>
          </DialogHeader>
          {viewingSnapshot && (
            <div className="space-y-4">
              <div className="aspect-video relative rounded-lg overflow-hidden bg-secondary">
                <Image
                  src={getPublicUrl(viewingSnapshot.storage_path)}
                  alt="Camera snapshot"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Captured</p>
                  <p>{new Date(viewingSnapshot.captured_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Size</p>
                  <p>{(viewingSnapshot.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Storage Path</p>
                  <p className="font-mono text-xs break-all">{viewingSnapshot.storage_path}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
