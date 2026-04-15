import { DashboardHeader } from "@/components/dashboard/header"
import { AgentSelector } from "@/components/agents/agent-selector"

export default function AgentsPage() {
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        title="AI Agents" 
        subtitle="Interact with specialized agents for setup, analysis, and insights"
      />
      
      <div className="flex-1 p-6 overflow-hidden">
        <AgentSelector />
      </div>
    </div>
  )
}
