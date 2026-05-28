import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

// Camera folders that exist in the camera-snapshots bucket.
// Mirrors image_proxy.py CAMERAS dict; if a new camera is added there, add it here too.
const KNOWN_CAMERA_FOLDERS = ["camera_1", "camera_2", "camera_3"] as const

// Proxies a private camera-snapshots storage object so the browser can display it.
//
// Two modes:
//   1. ?path=snapshots/camera_2/snapshot_xxx.jpg   (legacy / direct path)
//   2. ?image_id=snapshot_xxx                     (auto-search across camera folders)
//
// If `path` is given but the file is not found, the route also falls back to
// auto-search using the basename of the path. This protects older studies
// whose metadata.camera_id was never recorded.
export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get("path")
  const imageIdParam = req.nextUrl.searchParams.get("image_id")

  if (!pathParam && !imageIdParam) {
    return NextResponse.json(
      { error: "Missing path or image_id" },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()

  // 1. If the caller passed an explicit path, try that first.
  if (pathParam) {
    const { data, error } = await supabase.storage
      .from("camera-snapshots")
      .download(pathParam)

    if (!error && data) {
      const buffer = await data.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": data.type || "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      })
    }
  }

  // 2. Fallback: derive the image_id and search across all known camera folders.
  //    This handles two cases:
  //      (a) caller passed image_id directly
  //      (b) caller passed a path whose camera folder turned out wrong
  let imageId = imageIdParam
  if (!imageId && pathParam) {
    // Extract basename without extension: "snapshots/camera_X/snapshot_yyy.jpg" → "snapshot_yyy"
    const m = pathParam.match(/([^/]+?)(?:\.jpg|\.jpeg|\.png)?$/)
    imageId = m?.[1] ?? null
  }

  if (!imageId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  for (const folder of KNOWN_CAMERA_FOLDERS) {
    const tryPath = `snapshots/${folder}/${imageId}.jpg`
    const { data, error } = await supabase.storage
      .from("camera-snapshots")
      .download(tryPath)

    if (!error && data) {
      const buffer = await data.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": data.type || "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      })
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
