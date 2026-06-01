import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DemoBanner } from "@/components/dashboard/demo-banner"
import { ReviewBanner } from "@/components/dashboard/review-banner"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { isReviewMode } from "@/lib/review-mode"
import { getDefaultSpace } from "@/lib/spaces"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const scenario = await getDemoScenario()
  const review = await isReviewMode()
  const defaultSpaceId = scenario !== null
    ? await getDemoSpaceId()
    : (await getDefaultSpace())?.id ?? null
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav defaultSpaceId={defaultSpaceId ?? undefined} />
      <div className="flex flex-col flex-1 overflow-hidden">
        {scenario && <DemoBanner scenario={scenario} />}
        {review && !scenario && <ReviewBanner />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
