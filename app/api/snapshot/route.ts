import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

// Proxies a private camera-snapshots storage object so the browser can display it.
// Usage: /api/snapshot?path=snapshots/camera_loft_camera_fluent/snapshot_xxx.jpg
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 })

  const supabase = getServiceClient()
  const { data, error } = await supabase.storage
    .from("camera-snapshots")
    .download(path)

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = await data.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  })
}
