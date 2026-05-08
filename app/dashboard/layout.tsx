import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DemoBanner } from "@/components/dashboard/demo-banner"
import { getDemoScenario } from "@/lib/demo-mode"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const scenario = await getDemoScenario()

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav />
      <div className="flex flex-col flex-1 overflow-hidden">
        {scenario && <DemoBanner scenario={scenario} />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
