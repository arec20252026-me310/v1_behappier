import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DemoBanner } from "@/components/dashboard/demo-banner"
import { isDemoMode } from "@/lib/demo-mode"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const demo = await isDemoMode()

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <div className="flex flex-col flex-1 overflow-hidden">
        {demo && <DemoBanner />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
