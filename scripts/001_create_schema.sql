-- OccupancyIQ Database Schema
-- Core tables for spaces, zones, cameras, studies, and behavioral events

-- Spaces table: represents a building or facility
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  total_area_sqft INTEGER,
  building_type TEXT, -- office, retail, healthcare, education, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zones table: subdivisions within a space
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_type TEXT, -- lobby, hallway, workspace, meeting_room, break_room, etc.
  grid_x INTEGER NOT NULL DEFAULT 0,
  grid_y INTEGER NOT NULL DEFAULT 0,
  grid_width INTEGER NOT NULL DEFAULT 1,
  grid_height INTEGER NOT NULL DEFAULT 1,
  color TEXT DEFAULT '#3B82F6',
  capacity INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cameras table: video feeds connected to zones
CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stream_url TEXT,
  status TEXT DEFAULT 'inactive', -- active, inactive, error
  field_of_view JSONB DEFAULT '{}', -- coverage area within zone
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral metrics definitions
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- traffic_flow, utilization, social_interaction
  unit TEXT, -- count, percentage, minutes, etc.
  calculation_method TEXT, -- how the metric is computed
  literature_reference TEXT, -- academic citation supporting this metric
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Micro-studies: focused analysis sessions
CREATE TABLE IF NOT EXISTS studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  target_zones UUID[] DEFAULT '{}', -- zones to monitor
  target_metrics UUID[] DEFAULT '{}', -- metrics to track
  findings JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral events: real-time observations from video analysis
CREATE TABLE IF NOT EXISTS behavioral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
  study_id UUID REFERENCES studies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- person_entered, person_exited, group_formed, dwell_start, dwell_end, interaction_start, etc.
  event_data JSONB NOT NULL DEFAULT '{}', -- semantic analysis results
  occupancy_count INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated metrics: periodic rollups for analysis
CREATE TABLE IF NOT EXISTS metric_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  study_id UUID REFERENCES studies(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL, -- hourly, daily, weekly
  value NUMERIC NOT NULL,
  sample_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent conversations: chat history with AI agents
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- welcome, needfinding, video_analysis, analysis
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}', -- relevant context for the conversation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights: AI-generated actionable insights
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  study_id UUID REFERENCES studies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- pattern, anomaly, recommendation, trend
  severity TEXT DEFAULT 'info', -- info, warning, critical
  related_zones UUID[] DEFAULT '{}',
  related_metrics UUID[] DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  is_acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_zones_space_id ON zones(space_id);
CREATE INDEX IF NOT EXISTS idx_cameras_zone_id ON cameras(zone_id);
CREATE INDEX IF NOT EXISTS idx_metrics_space_id ON metrics(space_id);
CREATE INDEX IF NOT EXISTS idx_studies_space_id ON studies(space_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_zone_id ON behavioral_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_timestamp ON behavioral_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_metric_aggregations_zone_metric ON metric_aggregations(zone_id, metric_id);
CREATE INDEX IF NOT EXISTS idx_insights_space_id ON insights(space_id);
