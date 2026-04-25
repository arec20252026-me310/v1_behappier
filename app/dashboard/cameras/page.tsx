"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CameraManager } from "@/components/cameras/camera-manager"
import { DashboardHeader } from "@/components/dashboard/header"
import type { Zone } from "@/lib/types"

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

export default function CamerasPage() {
  const [cameras, setCameras] = useState<HACameraMapping[]>([])
  const [snapshots, setSnapshots] = useState<CameraSnapshot[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Load camera mappings
      const { data: cameraData } = await supabase
        .from("ha_camera_mappings")
        .select("*")
        .order("created_at", { ascending: false })

      // Load recent snapshots
      const { data: snapshotData } = await supabase
        .from("camera_snapshots")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(50)

      // Load zones for linking
      const { data: zoneData } = await supabase
        .from("zones")
        .select("*")
        .order("name", { ascending: true })

      if (cameraData) setCameras(cameraData)
      if (snapshotData) setSnapshots(snapshotData)
      if (zoneData) setZones(zoneData)
      setLoading(false)
    }

    loadData()

    // Set up real-time subscription for new snapshots
    const channel = supabase
      .channel("camera-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "camera_snapshots" },
        (payload) => {
          setSnapshots((prev) => [payload.new as CameraSnapshot, ...prev].slice(0, 50))
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ha_camera_mappings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCameras((prev) => [payload.new as HACameraMapping, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setCameras((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as HACameraMapping) : c))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Cameras"
        description="Manage Home Assistant cameras and view snapshots"
      />
      <main className="flex-1 p-6">
        <CameraManager
          cameras={cameras}
          snapshots={snapshots}
          zones={zones}
          loading={loading}
          onUpdateCamera={async (cameraId, updates) => {
            const { error } = await supabase
              .from("ha_camera_mappings")
              .update(updates)
              .eq("id", cameraId)

            if (!error) {
              setCameras((prev) =>
                prev.map((c) => (c.id === cameraId ? { ...c, ...updates } : c))
              )
            }
          }}
        />
      </main>
    </div>
  )
}
