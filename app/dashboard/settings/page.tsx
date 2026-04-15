import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="Settings" 
        subtitle="Configure your OccupancyIQ preferences"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Application Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Settings will be available in a future update
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
