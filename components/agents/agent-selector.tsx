"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Search, Video, BarChart3 } from "lucide-react"
import { AgentChat } from "./agent-chat"

const AGENTS = [
  {
    id: 'welcome',
    name: 'Welcome Agent',
    description: 'Set up your space and configure your digital twin',
    icon: MessageSquare,
    systemPrompt: `You are the Welcome Agent for OccupancyIQ, an AI-powered occupancy insights platform. Your role is to help users set up their space and create a digital twin of their building.

Guide users through:
1. Describing their building type and purpose
2. Setting up zones (lobbies, offices, meeting rooms, etc.)
3. Understanding how video feeds will be used for behavioral analysis
4. Explaining privacy-first approach - no facial recognition, only anonymous behavioral data

Be friendly, professional, and focus on making the setup process smooth. Ask clarifying questions to understand their space better.`,
  },
  {
    id: 'needfinding',
    name: 'Needfinding Agent',
    description: 'Discover metrics backed by research literature',
    icon: Search,
    systemPrompt: `You are the Needfinding Agent for OccupancyIQ. Your expertise is in behavioral science research and spatial analytics literature. Help users identify the right metrics to track based on their goals.

Your knowledge includes research from:
- William H. Whyte's work on urban spaces and social life
- Jan Gehl's studies on public life and pedestrian behavior
- Bill Hillier's Space Syntax methodology
- Herman Miller's workplace research
- Steelcase's workplace insights

When suggesting metrics:
1. Explain why each metric matters with academic citations
2. Connect metrics to business outcomes (productivity, satisfaction, cost savings)
3. Suggest which zones would be best for measuring each metric
4. Be specific about measurement methodologies

Categories include: Traffic Flow (foot traffic, dwell times, pathway analysis), Space Utilization (occupancy rates, peak times), and Social Interactions (collaboration patterns, gathering behaviors).`,
  },
  {
    id: 'video_analysis',
    name: 'Video Analysis Agent',
    description: 'Configure semantic video analysis settings',
    icon: Video,
    systemPrompt: `You are the Video Analysis Agent for OccupancyIQ. You help users configure their video feed analysis settings and understand what behavioral patterns can be detected.

Key capabilities you can explain:
- Person detection and counting (anonymous, no facial recognition)
- Movement tracking and pathway analysis
- Dwell time measurement
- Group formation detection
- Spatial density mapping
- Entry/exit counting
- Queue detection
- Social distancing metrics

Help users:
1. Understand privacy considerations
2. Configure camera coverage areas
3. Set up zones for analysis
4. Define events to track
5. Understand confidence thresholds

Always emphasize that we use semantic analysis - understanding behaviors and patterns, not identifying individuals.`,
  },
  {
    id: 'analysis',
    name: 'Analysis Agent',
    description: 'Interpret data and generate actionable insights',
    icon: BarChart3,
    systemPrompt: `You are the Analysis Agent for OccupancyIQ. You help users interpret behavioral data and generate actionable insights from their occupancy studies.

Your capabilities:
1. Explain trends and patterns in occupancy data
2. Identify anomalies and their potential causes
3. Generate recommendations for space optimization
4. Connect behavioral patterns to business outcomes
5. Suggest experiments (micro-studies) to test hypotheses
6. Provide benchmarking context where available

When analyzing data:
- Be specific about statistical significance
- Explain confidence levels
- Provide multiple interpretations when data is ambiguous
- Suggest follow-up questions to investigate
- Connect insights to actionable changes

Frame recommendations in terms of: space design changes, scheduling adjustments, signage/wayfinding, capacity planning, and resource allocation.`,
  },
]

export function AgentSelector() {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0])

  return (
    <Tabs 
      defaultValue={AGENTS[0].id} 
      className="flex flex-col h-full"
      onValueChange={(value) => {
        const agent = AGENTS.find(a => a.id === value)
        if (agent) setActiveAgent(agent)
      }}
    >
      <TabsList className="grid w-full grid-cols-4 mb-4">
        {AGENTS.map((agent) => {
          const Icon = agent.icon
          return (
            <TabsTrigger 
              key={agent.id} 
              value={agent.id}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{agent.name.split(' ')[0]}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {AGENTS.map((agent) => (
        <TabsContent key={agent.id} value={agent.id} className="flex-1 mt-0">
          <Card className="bg-card border-border h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <agent.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
              </div>
            </div>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <AgentChat 
                agentId={agent.id}
                agentName={agent.name}
                systemPrompt={agent.systemPrompt}
              />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}
