import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DemoBanner } from "@/components/dashboard/demo-banner"
import { ReviewBanner } from "@/components/dashboard/review-banner"
import { getDemoScenario, getDemoSpaceId } from "@/lib/demo-mode"
import { isReviewMode } from "@/lib/review-mode"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const scenario = await getDemoScenario()
  const review = await isReviewMode()
  const demoSpaceId = scenario ? await getDemoSpaceId() : ""

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <div className="flex flex-col flex-1 overflow-hidden">
        {scenario && <DemoBanner scenario={scenario} demoSpaceId={demoSpaceId} />}
        {review && !scenario && <ReviewBanner />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
