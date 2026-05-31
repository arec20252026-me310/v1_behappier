import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Microscope, MapPin, Palette, Maximize2 } from "lucide-react"
import { ThemeSwitcher } from "@/components/settings/theme-switcher"
import { DashboardSettings } from "@/components/settings/dashboard-settings"
import { isReviewMode } from "@/lib/review-mode"
import { enableReviewMode, disableReviewMode } from "@/app/actions/review"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { getAllSpaces, getDefaultSpace } from "@/lib/spaces"
import { DefaultSpacePicker } from "@/components/settings/default-space-picker"
import { DEMO_SPACE, DEMO_LGQ_SPACE, DEMO_EXPE_SPACE } from "@/lib/demo-seeds"
import type { Space } from "@/lib/types"

export default async function SettingsPage() {
  const review = await isReviewMode()
  const scenario = await getDemoScenario()
  const demo = scenario !== null

  const allSpaces: Space[] = demo
    ? (scenario !== "blank" ? [DEMO_SPACE as Space, DEMO_LGQ_SPACE as Space, DEMO_EXPE_SPACE as Space] : [])
    : await getAllSpaces()
  const defaultSpaceId = demo
    ? await getDemoSpaceId()
    : (await getDefaultSpace())?.id ?? null

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Settings"
        subtitle="Configure your OccupancyIQ preferences"
      />

      <div className="flex-1 p-6 overflow-auto space-y-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-400" />
              Default Space
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The default space controls which space is shown across the Dashboard, Micro-Studies, and Insights tabs.
              You can configure additional spaces in the Space Builder tab.
            </p>
            <DefaultSpacePicker spaces={allSpaces} defaultSpaceId={defaultSpaceId} isDemo={demo} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-400" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose between light and dark mode. Light mode is the default.
            </p>
            <ThemeSwitcher />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-orange-400" />
              Showcase Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hides the metric summary cards, collapses the sidebar, and enters fullscreen for a clean presentation view.
            </p>
            <DashboardSettings />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Microscope className="h-4 w-4 text-blue-400" />
              Review Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              When active, camera snapshots are saved alongside each behavior detection during a study.
              The Insights tab shows thumbnails next to each AI description so you can manually
              verify the model's accuracy.
            </p>
            <p className="text-xs text-muted-foreground">
              Snapshots are stored in Supabase Storage under{" "}
              <code className="font-mono bg-muted px-1 rounded">camera-snapshots/snapshots/…</code>.
              The n8n behavior monitoring workflow must have review-mode saving enabled for images to appear.
            </p>
            <form action={review ? disableReviewMode : enableReviewMode}>
              <button
                type="submit"
                className={`text-sm px-4 py-2 rounded border transition-colors ${
                  review
                    ? "border-blue-500/60 text-blue-300 hover:bg-blue-500/10"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {review ? "Disable review mode" : "Enable review mode"}
              </button>
            </form>
            {review && (
              <p className="text-xs text-blue-400/80">
                Review mode is currently active. New studies will include snapshot saving.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
