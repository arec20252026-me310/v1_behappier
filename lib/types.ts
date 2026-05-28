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
  started_at?: string | null
  duration_seconds?: number | null
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
  insights: string | string[]
  recommendations: string | string[]
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
  is_default: boolean
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
  rubric: string | null
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
    rubric: 'Count the number of people who appear to be actively walking, entering, or exiting the space. Do not count people who are seated, stationary, or clearly paused. Score = total count of people visibly in motion. Score 0 if no one is moving.',
  },
  {
    name: 'Average Dwell Time',
    category: 'traffic_flow',
    description: 'Average time spent by individuals in a zone',
    unit: 'minutes',
    literature_reference: 'Gehl, J. (2011). Life Between Buildings',
    rubric: 'Estimate the dwell time of each stationary person visible using visual cues: a person standing with a coat or bag suggests 1-5 minutes; seated at a workstation suggests 15-45 minutes; working with multiple items spread out or eating suggests 45 or more minutes. Score = average estimated dwell time in minutes across all stationary people, rounded to the nearest whole number. Score 0 if no stationary people are present.',
  },
  {
    name: 'Peak Occupancy',
    category: 'utilization',
    description: 'Maximum number of occupants at any given time',
    unit: 'count',
    literature_reference: 'Hillier, B. (2007). Space is the Machine',
    rubric: 'Count every visible person in the observed area (seated, standing, or moving). Include partially visible people if their presence can be reasonably confirmed. This snapshot value is recorded each interval; the peak is the maximum headcount observed across all snapshots in the study. Score = total headcount in this snapshot.',
  },
  {
    name: 'Utilization Rate',
    category: 'utilization',
    description: 'Percentage of capacity being used over time',
    unit: 'percentage',
    literature_reference: 'Duffy, F. (1997). The New Office',
    rubric: 'Count all people currently present in the observed area (seated, standing, or moving). Divide by the zone stated capacity and multiply by 100, then round to the nearest whole number. If capacity is unknown, estimate from the number of workstations or seats visible in frame. Score = round((headcount / zone capacity) x 100). Score 0 if no people are present.',
  },
  {
    name: 'Collaboration Index',
    category: 'social_interaction',
    description: 'Active collaborative clusters of 2 or more people within conversational distance, weighted by group size',
    unit: 'score',
    literature_reference: 'Allen, T. (1977). Managing the Flow of Technology',
    rubric: 'Identify distinct clusters of 2 or more people within approximately 2 meters of each other who are oriented toward one another (facing, in a circle, or side-by-side with shared attention). Score each cluster by the number of people in it minus 1: a group of 2 = 1 point, a group of 3 = 2 points, a group of 4 = 3 points, and so on. Do not count people who are physically close but clearly working independently (heads down, backs turned, no shared gaze or object). Score = sum of points across all clusters. Score 0 if no collaborative groups are visible.',
  },
  {
    name: 'Social Density',
    category: 'social_interaction',
    description: 'Number of social interactions per square foot',
    unit: 'interactions/sqft',
    literature_reference: 'Mehta, V. (2013). The Street: A Quintessential Social Public Space',
    rubric: 'Count all visible social interactions in the frame: conversations, greetings, shared attention toward a common object, or collaborative activity. Estimate the total observable floor area in square feet. Score = round((interaction count / estimated floor area) x 100). Score 0 if no social interactions are present.',
  },
  {
    name: 'Energy Level',
    category: 'social_interaction',
    description: 'Observable arousal and activity level of occupants based on body language, posture, and movement',
    unit: 'score',
    literature_reference: 'Russell, J.A. (1980). A circumplex model of affect. Journal of Personality and Social Psychology, 39(6), 1161-1178.',
    rubric: 'For each visible person, assess their energy level using Russell\'s arousal dimension — the behavioral cues that indicate high vs. low activation. Score each person individually: 1-2 = low energy (slumped or reclined posture, head resting on hands, eyes downcast or closed, minimal movement); 3-4 = below average (seated with reduced engagement, inward posture, few gestures); 5-6 = moderate (upright seated posture, engaged but calm, occasional movement or gesture); 7-8 = above average (visibly engaged, leaning forward, active gestures, animated expression or conversation); 9-10 = high energy (standing, moving around, expressive body language, facilitating group activity). Score = average across all visible people, rounded to nearest whole number. Score 0 if no people are visible.',
  },
  // Comfort metrics
  {
    name: 'Crowding Index',
    category: 'comfort',
    description: 'Perceived crowding based on density relative to space capacity',
    unit: 'score',
    literature_reference: 'Stokols, D. (1972). On the distinction between density and crowding',
    rubric: 'Assess the perceived crowding level based on visible spacing between people. Score on this scale: 0 = empty; 1-3 = comfortable, more than 2 meters between most people; 4-6 = noticeable density, some areas feel busy but movement is unimpeded; 7-9 = high density, people frequently navigate around each other; 10 = extremely crowded, close-contact conditions. Score = single whole number on this 0-10 scale.',
  },
  {
    name: 'Personal Space Availability',
    category: 'comfort',
    description: 'Average personal space buffer around occupants',
    unit: 'sqft/person',
    literature_reference: 'Hall, E.T. (1966). The Hidden Dimension',
    rubric: 'Count all visible people. Estimate the total floor area visible in the frame in square feet. Score = round(estimated area / headcount). Reference: below 6 sqft/person is intimate crowding; 6-16 is personal distance; 16-130 is social distance; above 130 is public distance per Hall proxemics. Score 0 if no people are present.',
  },
  {
    name: 'Seating Comfort Score',
    category: 'comfort',
    description: 'Availability and usage patterns of seating areas',
    unit: 'score',
    literature_reference: 'Whyte, W. (1980). The Social Life of Small Urban Spaces',
    rubric: 'Count total visible seats or seating surfaces (chairs, benches, stools, couches). Count how many are occupied. Note comfort workarounds: people perching on non-seat surfaces or standing near empty seats. Score = round((occupied seats / total seats) x 10). If all seats are full and people are standing or perching nearby, score = 10. Score 0 if no seating is visible or all seating is blocked.',
  },
  {
    name: 'Queue Stress Index',
    category: 'comfort',
    description: 'Comfort level based on queue lengths and wait times',
    unit: 'score',
    literature_reference: 'Maister, D. (1985). The Psychology of Waiting Lines',
    rubric: 'Look for people waiting in line or queuing. Score based on queue length and visible stress cues: 0 = no queues present; 1-3 = short queue with orderly spacing, people appear calm; 4-6 = moderate queue, people checking phones or shifting weight; 7-9 = long queue with visible agitation or people leaving; 10 = extremely long queue with chaotic or distressed behavior. Score = single whole number on this 0-10 scale.',
  },
  {
    name: 'Movement Freedom Index',
    category: 'comfort',
    description: 'Ease of movement through space without obstruction',
    unit: 'score',
    literature_reference: 'Fruin, J. (1971). Pedestrian Planning and Design',
    rubric: 'Assess how freely people can move through the visible space based on Fruin Level of Service. Score: 10 = completely open, unimpeded movement; 7-9 = minor congestion, occasional path adjustments needed; 4-6 = moderate congestion, frequent yielding required; 1-3 = heavy congestion, movement severely restricted; 0 = standstill, no free movement possible. Score = single whole number on this 0-10 scale.',
  },
  // Safety metrics
  {
    name: 'Emergency Egress Clearance',
    category: 'safety',
    description: 'Clearance of emergency exit pathways',
    unit: 'percentage',
    literature_reference: 'NFPA 101 Life Safety Code (2021)',
    rubric: 'Identify all visible emergency exits, exit doors, and marked egress pathways in the frame. Count the total number visible. Count how many are fully clear of obstructions (no furniture, equipment, or people blocking them). Score = round((clear pathways / total visible pathways) x 100). If no exit pathways are visible in the frame, score = 100. Score 0 only if all visible pathways are completely blocked.',
  },
  {
    name: 'Occupancy Limit Compliance',
    category: 'safety',
    description: 'Real-time tracking against maximum occupancy limits',
    unit: 'percentage',
    literature_reference: 'International Building Code (2021)',
    rubric: 'Count all people currently visible in the space. Compare to zone stated capacity. Score = round((headcount / zone capacity) x 100). A score of 100 means exactly at capacity; above 100 indicates non-compliance. If capacity is unknown, estimate from visible workstations or seats. Score 0 if no people are present.',
  },
  {
    name: 'Slip/Fall Risk Index',
    category: 'safety',
    description: 'Detection of wet floors, obstacles, or hazardous conditions',
    unit: 'score',
    literature_reference: 'OSHA Walking-Working Surfaces Standard (2017)',
    rubric: 'Scan visible floor and walking surfaces for hazards: wet floor signs, spills or puddles, cords or cables across pathways, cluttered walkways, loose mats, or damaged flooring. Score: 0 = no hazards visible; 1-3 = minor hazards in low-traffic areas; 4-6 = moderate hazards in trafficked areas; 7-9 = significant hazards in main walkways; 10 = severe hazards creating immediate risk. Score = single whole number on this 0-10 scale.',
  },
  {
    name: 'Crowd Density Alert',
    category: 'safety',
    description: 'Detection of dangerous crowd density levels',
    unit: 'persons/sqm',
    literature_reference: 'Still, G.K. (2014). Introduction to Crowd Science',
    rubric: 'Count all visible people in the frame. Estimate the area of the space in square meters. Score = round(headcount / estimated area in square meters). Reference thresholds per Still: below 1 person/sqm is comfortable; 1-2 is busy; 2-4 is crowded; above 4 is dangerous. Score 0 if no people are present.',
  },
  {
    name: 'Equipment Fault Detection',
    category: 'safety',
    description: 'Visual detection of malfunctioning equipment or facilities',
    unit: 'count',
    literature_reference: 'ISO 55000 Asset Management Standard (2014)',
    rubric: 'Scan the visible space for equipment or facility faults: broken furniture, damaged fixtures, malfunctioning doors, leaking pipes, failed or flickering lights, damaged signage, overflowing bins, or other visible defects. Score = total count of distinct visible faults. Score 0 if no faults are visible.',
  },
  {
    name: 'Social Distancing Compliance',
    category: 'safety',
    description: 'Monitoring of interpersonal distance during health protocols',
    unit: 'percentage',
    literature_reference: 'WHO Physical Distancing Guidelines (2020)',
    rubric: 'Identify pairs of people who appear to be within 1 meter of each other and are not in an intentional social group (i.e., strangers in a shared space or queue context). Count total people visible. Count non-compliant individuals. Score = round(((total people - non-compliant people) / total people) x 100). Score 100 if all visible people maintain at least 1 meter distance or if fewer than 2 people are visible.',
  },
  {
    name: 'Unattended Object Detection',
    category: 'safety',
    description: 'Identification of abandoned bags or suspicious items',
    unit: 'count',
    literature_reference: 'DHS Security Standards for Public Spaces (2019)',
    rubric: 'Scan the visible space for bags, backpacks, packages, luggage, or other personal objects left without a person visibly within approximately 2 meters of them. Do not count objects clearly adjacent to or held by a person. Score = total count of unattended objects. Score 0 if no unattended objects are visible.',
  },
  {
    name: 'Lighting Adequacy Score',
    category: 'safety',
    description: 'Assessment of lighting levels for safe navigation',
    unit: 'score',
    literature_reference: 'IESNA Lighting Handbook (2020)',
    rubric: 'Assess overall lighting quality visible in the frame. Score: 10 = uniformly well-lit, appropriate brightness for all visible tasks, no dark areas or glare; 7-9 = mostly adequate with minor issues; 4-6 = noticeable dark areas or glare affecting parts of the space; 1-3 = significant deficiencies affecting most of the space; 0 = space is dark and unsafe for navigation. Score = single whole number on this 0-10 scale.',
  },
  {
    name: 'Ergonomic Posture Risk',
    category: 'safety',
    description: 'Postural risk score for visible workstation users based on body position deviations',
    unit: 'score',
    literature_reference: 'Hignett, S. & McAtamney, L. (2000). Rapid Entire Body Assessment (REBA). Applied Ergonomics, 31, 201-205.',
    rubric: 'For each person visible at a workstation, count how many of the following REBA-based risk indicators are present: (1) head tilted more than 20 degrees forward or sideways; (2) shoulders raised, hunched, or reaching beyond shoulder width; (3) trunk flexed more than 20 degrees forward or twisted; (4) wrists in extreme extension or flexion. Score per person based on indicator count: 0 indicators = 1; 1 indicator = 3; 2 indicators = 5; 3 indicators = 7; 4 indicators = 10. Score = average across all visible workstation users, rounded to nearest whole number. Score 0 if no people are visible at workstations.',
  },
] as const
