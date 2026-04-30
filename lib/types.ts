// Database types for OccupancyIQ

// ── Backend (n8n) types ──────────────────────────────────────────────────────

export type BEStudyStage =
  | 'draft'
  | 'planned'
  | 'needfinding_running'
  | 'needfinding_complete'
  | 'monitoring_running'
  | 'monitoring_paused'
  | 'milestone_review'
  | 'monitoring_complete'
  | 'insights_running'
  | 'complete'
  | 'failed'

export interface BEStudy {
  id: string
  study_id: string
  building_id: string | null
  user_id: string | null
  session_id: string | null
  study_goal: string
  status: string
  current_stage: BEStudyStage
  live_preview_status: string | null
  study_plan: Record<string, unknown>
  task_graph: Record<string, unknown>
  graph_plan: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Partner-added columns — nullable until migration lands:
  start_date_time?: string | null
  duration_minutes?: number | null
}

export interface BEInsightOutput {
  id: string
  study_id: string
  output_mode: 'milestone_summary' | 'final_insights'
  status: string
  dashboard_summary: string | null
  charts: Array<{
    chart_id: string
    chart_type: string
    title: string
    data: Record<string, unknown>
  }>
  tables: Array<{
    table_id: string
    title: string
    columns: string[]
    rows: unknown[][]
  }>
  insights: string[]
  recommendations: string[]
  created_at: string
}

export interface BELivePreviewMetrics {
  id: string
  study_id: string
  status: string
  label: string | null
  metrics: Record<string, unknown>
  updated_at: string
}

export interface HACameraMapping {
  id: string
  camera_id: string | null
  ha_entity_id: string
  ha_friendly_name: string | null
  ha_device_class: string | null
  snapshot_interval_seconds: number | null
  is_active: boolean
  last_snapshot_at: string | null
  created_at: string
  updated_at: string
}

// ── Frontend types ───────────────────────────────────────────────────────────

export interface Space {
  id: string
  name: string
  description: string | null
  address: string | null
  total_area_sqft: number | null
  building_type: string | null
  floor_plan_url: string | null
  grid_resolution: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  space_id: string
  name: string
  zone_type: string | null
  grid_x: number
  grid_y: number
  grid_width: number
  grid_height: number
  color: string
  capacity: number | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Camera {
  id: string
  zone_id: string
  name: string
  stream_url: string | null
  status: 'active' | 'inactive' | 'error'
  field_of_view: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  space_id: string
  name: string
  description: string | null
  category: 'traffic_flow' | 'utilization' | 'social_interaction' | 'comfort' | 'safety'
  unit: string | null
  calculation_method: string | null
  literature_reference: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Study {
  id: string
  space_id: string
  name: string
  description: string | null
  hypothesis: string | null
  status: 'draft' | 'active' | 'paused' | 'completed'
  start_time: string | null
  end_time: string | null
  planned_duration_minutes: number | null
  target_zones: string[]
  target_metrics: string[]
  findings: Record<string, unknown>
  recommendations: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BehavioralEvent {
  id: string
  zone_id: string
  camera_id: string | null
  study_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  occupancy_count: number | null
  timestamp: string
  created_at: string
}

export interface MetricAggregation {
  id: string
  zone_id: string
  metric_id: string
  study_id: string | null
  period_start: string
  period_end: string
  period_type: 'hourly' | 'daily' | 'weekly'
  value: number
  sample_count: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentConversation {
  id: string
  space_id: string | null
  agent_type: 'welcome' | 'needfinding' | 'video_analysis' | 'analysis'
  messages: ChatMessage[]
  context: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Insight {
  id: string
  space_id: string
  study_id: string | null
  title: string
  description: string
  insight_type: 'pattern' | 'anomaly' | 'recommendation' | 'trend'
  severity: 'info' | 'warning' | 'critical'
  related_zones: string[]
  related_metrics: string[]
  action_items: ActionItem[]
  is_acknowledged: boolean
  created_at: string
}

export interface ActionItem {
  id: string
  title: string
  description: string
  completed: boolean
}

// Client-side camera placement for the visual map builder
export type CameraDirection = 'up' | 'down' | 'left' | 'right'

export interface CameraPlacement {
  id: string
  zoneId: string    // the zone this camera is assigned to
  x: number         // pixel x position within the grid container
  y: number         // pixel y position within the grid container
  direction: CameraDirection
  label: string
}

// Zone types for the editor
export const ZONE_TYPES = [
  { value: 'lobby', label: 'Lobby', color: '#3B82F6' },
  { value: 'hallway', label: 'Hallway', color: '#8B5CF6' },
  { value: 'workspace', label: 'Workspace', color: '#10B981' },
  { value: 'meeting_room', label: 'Meeting Room', color: '#F59E0B' },
  { value: 'break_room', label: 'Break Room', color: '#EF4444' },
  { value: 'restroom', label: 'Restroom', color: '#6B7280' },
  { value: 'entrance', label: 'Entrance', color: '#06B6D4' },
  { value: 'kitchen', label: 'Kitchen', color: '#EC4899' },
  { value: 'other', label: 'Other', color: '#9CA3AF' },
] as const

// Metric categories
export const METRIC_CATEGORIES = [
  {
    value: 'traffic_flow',
    label: 'Traffic & Flow',
    description: 'Foot traffic, movement patterns, dwell times',
    icon: 'activity',
  },
  {
    value: 'utilization',
    label: 'Space Utilization',
    description: 'Occupancy rates, peak usage, underutilized areas',
    icon: 'bar-chart',
  },
  {
    value: 'social_interaction',
    label: 'Social Interactions',
    description: 'Collaboration zones, gathering patterns',
    icon: 'users',
  },
  {
    value: 'comfort',
    label: 'Comfort',
    description: 'Occupant comfort levels, thermal and spatial comfort',
    icon: 'thermometer',
  },
  {
    value: 'safety',
    label: 'Safety',
    description: 'Safety metrics and facilities fault detection',
    icon: 'shield',
  },
] as const

// Pre-defined metrics with literature references
export const PREDEFINED_METRICS = [
  {
    name: 'Foot Traffic Count',
    category: 'traffic_flow',
    description: 'Number of people entering/exiting a zone',
    unit: 'count',
    literature_reference: 'Whyte, W. (1980). The Social Life of Small Urban Spaces',
  },
  {
    name: 'Average Dwell Time',
    category: 'traffic_flow',
    description: 'Average time spent by individuals in a zone',
    unit: 'minutes',
    literature_reference: 'Gehl, J. (2011). Life Between Buildings',
  },
  {
    name: 'Peak Occupancy',
    category: 'utilization',
    description: 'Maximum number of occupants at any given time',
    unit: 'count',
    literature_reference: 'Hillier, B. (2007). Space is the Machine',
  },
  {
    name: 'Utilization Rate',
    category: 'utilization',
    description: 'Percentage of capacity being used over time',
    unit: 'percentage',
    literature_reference: 'Duffy, F. (1997). The New Office',
  },
  {
    name: 'Collaboration Index',
    category: 'social_interaction',
    description: 'Frequency and duration of group formations',
    unit: 'score',
    literature_reference: 'Allen, T. (1977). Managing the Flow of Technology',
  },
  {
    name: 'Social Density',
    category: 'social_interaction',
    description: 'Number of social interactions per square foot',
    unit: 'interactions/sqft',
    literature_reference: 'Mehta, V. (2013). The Street: A Quintessential Social Public Space',
  },
  // Comfort metrics
  {
    name: 'Crowding Index',
    category: 'comfort',
    description: 'Perceived crowding based on density relative to space capacity',
    unit: 'score',
    literature_reference: 'Stokols, D. (1972). On the distinction between density and crowding',
  },
  {
    name: 'Personal Space Availability',
    category: 'comfort',
    description: 'Average personal space buffer around occupants',
    unit: 'sqft/person',
    literature_reference: 'Hall, E.T. (1966). The Hidden Dimension',
  },
  {
    name: 'Seating Comfort Score',
    category: 'comfort',
    description: 'Availability and usage patterns of seating areas',
    unit: 'score',
    literature_reference: 'Whyte, W. (1980). The Social Life of Small Urban Spaces',
  },
  {
    name: 'Queue Stress Index',
    category: 'comfort',
    description: 'Comfort level based on queue lengths and wait times',
    unit: 'score',
    literature_reference: 'Maister, D. (1985). The Psychology of Waiting Lines',
  },
  {
    name: 'Movement Freedom Index',
    category: 'comfort',
    description: 'Ease of movement through space without obstruction',
    unit: 'score',
    literature_reference: 'Fruin, J. (1971). Pedestrian Planning and Design',
  },
  // Safety metrics
  {
    name: 'Emergency Egress Clearance',
    category: 'safety',
    description: 'Clearance of emergency exit pathways',
    unit: 'percentage',
    literature_reference: 'NFPA 101 Life Safety Code (2021)',
  },
  {
    name: 'Occupancy Limit Compliance',
    category: 'safety',
    description: 'Real-time tracking against maximum occupancy limits',
    unit: 'percentage',
    literature_reference: 'International Building Code (2021)',
  },
  {
    name: 'Slip/Fall Risk Index',
    category: 'safety',
    description: 'Detection of wet floors, obstacles, or hazardous conditions',
    unit: 'score',
    literature_reference: 'OSHA Walking-Working Surfaces Standard (2017)',
  },
  {
    name: 'Crowd Density Alert',
    category: 'safety',
    description: 'Detection of dangerous crowd density levels',
    unit: 'persons/sqm',
    literature_reference: 'Still, G.K. (2014). Introduction to Crowd Science',
  },
  {
    name: 'Equipment Fault Detection',
    category: 'safety',
    description: 'Visual detection of malfunctioning equipment or facilities',
    unit: 'count',
    literature_reference: 'ISO 55000 Asset Management Standard (2014)',
  },
  {
    name: 'Social Distancing Compliance',
    category: 'safety',
    description: 'Monitoring of interpersonal distance during health protocols',
    unit: 'percentage',
    literature_reference: 'WHO Physical Distancing Guidelines (2020)',
  },
  {
    name: 'Unattended Object Detection',
    category: 'safety',
    description: 'Identification of abandoned bags or suspicious items',
    unit: 'count',
    literature_reference: 'DHS Security Standards for Public Spaces (2019)',
  },
  {
    name: 'Lighting Adequacy Score',
    category: 'safety',
    description: 'Assessment of lighting levels for safe navigation',
    unit: 'score',
    literature_reference: 'IESNA Lighting Handbook (2020)',
  },
] as const
