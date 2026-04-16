-- Seed synthetic occupancy data for dashboard demonstration
-- This script creates a space, zones with occupancy, and an insight for Team 2 zone

-- First, ensure we have a space
INSERT INTO spaces (id, name, description, building_type, total_area_sqft)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Building A - Main Office',
  'Primary office building with open floor plan',
  'office',
  5000
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Delete existing zones to start fresh
DELETE FROM zones WHERE space_id = 'a0000000-0000-0000-0000-000000000001';

-- Create zones with grid positions for the heatmap
-- Layout: 8x8 grid
INSERT INTO zones (id, space_id, name, zone_type, grid_x, grid_y, grid_width, grid_height, color, capacity, metadata) VALUES
-- Reception/Lobby area (bottom left)
('z0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Lobby', 'lobby', 0, 5, 2, 3, '#3B82F6', 15, '{"current_occupancy": 8, "occupancy_percentage": 53}'),

-- Team 1 workspace (top left)
('z0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Team 1', 'workspace', 0, 0, 3, 3, '#10B981', 20, '{"current_occupancy": 14, "occupancy_percentage": 70}'),

-- Team 2 workspace (top right) - THIS ONE HAS AN INSIGHT
('z0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Team 2', 'workspace', 4, 0, 4, 3, '#F59E0B', 25, '{"current_occupancy": 23, "occupancy_percentage": 92}'),

-- Meeting Room A (middle left)
('z0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Meeting Room A', 'meeting_room', 0, 3, 2, 2, '#8B5CF6', 8, '{"current_occupancy": 6, "occupancy_percentage": 75}'),

-- Break Room (middle center)
('z0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Break Room', 'break_room', 2, 3, 2, 2, '#EF4444', 12, '{"current_occupancy": 4, "occupancy_percentage": 33}'),

-- Kitchen (bottom center)
('z0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Kitchen', 'kitchen', 2, 5, 2, 3, '#EC4899', 10, '{"current_occupancy": 3, "occupancy_percentage": 30}'),

-- Hallway (middle right connector)
('z0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Main Hallway', 'hallway', 4, 3, 2, 2, '#6B7280', 30, '{"current_occupancy": 5, "occupancy_percentage": 17}'),

-- Meeting Room B (bottom right)
('z0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Meeting Room B', 'meeting_room', 6, 3, 2, 2, '#8B5CF6', 6, '{"current_occupancy": 0, "occupancy_percentage": 0}'),

-- Quiet Zone (far right)
('z0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Quiet Zone', 'workspace', 4, 5, 4, 3, '#06B6D4', 8, '{"current_occupancy": 2, "occupancy_percentage": 25}');

-- Delete existing insights
DELETE FROM insights WHERE space_id = 'a0000000-0000-0000-0000-000000000001';

-- Create the synthetic insight for Team 2 zone (critical - high occupancy pattern)
INSERT INTO insights (id, space_id, study_id, title, description, insight_type, severity, related_zones, related_metrics, action_items, is_acknowledged)
VALUES (
  'i0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  'Team 2 Zone Consistently Over Capacity',
  'The Team 2 workspace has been operating at 85-95% capacity for the past 3 weeks, significantly higher than the recommended 70% threshold. This sustained high density is correlated with a 23% decrease in reported focus time and a 15% increase in meeting room booking conflicts. Historical data shows this pattern intensifies on Tuesdays and Wednesdays between 10am-3pm.',
  'anomaly',
  'critical',
  ARRAY['z0000000-0000-0000-0000-000000000003']::uuid[],
  ARRAY[]::uuid[],
  '[
    {"id": "action-1", "title": "Review team seating arrangements", "description": "Consider redistributing team members to nearby zones with lower utilization", "completed": false},
    {"id": "action-2", "title": "Implement hot-desking pilot", "description": "Test flexible seating policy to reduce peak density", "completed": false},
    {"id": "action-3", "title": "Schedule team check-in", "description": "Discuss workspace needs with Team 2 lead", "completed": false}
  ]'::jsonb,
  false
);

-- Add a few more supporting insights
INSERT INTO insights (id, space_id, study_id, title, description, insight_type, severity, related_zones, related_metrics, action_items, is_acknowledged)
VALUES
(
  'i0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  'Break Room Underutilized During Peak Hours',
  'The break room shows only 30-35% utilization during lunch hours (12pm-1pm), suggesting employees may be eating at their desks. This could be contributing to workspace crowding in team areas.',
  'pattern',
  'info',
  ARRAY['z0000000-0000-0000-0000-000000000005']::uuid[],
  ARRAY[]::uuid[],
  '[{"id": "action-4", "title": "Promote break room usage", "description": "Send communication encouraging proper lunch breaks", "completed": false}]'::jsonb,
  false
),
(
  'i0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  'Meeting Room B Booking Inefficiency',
  'Meeting Room B is booked 60% of the time but actual occupancy is only 15%. Consider implementing a check-in system to release unused bookings.',
  'recommendation',
  'warning',
  ARRAY['z0000000-0000-0000-0000-000000000008']::uuid[],
  ARRAY[]::uuid[],
  '[{"id": "action-5", "title": "Implement auto-release policy", "description": "Release bookings if room not checked into within 10 minutes", "completed": false}]'::jsonb,
  true
);

-- Create some behavioral events for Team 2 to show activity
INSERT INTO behavioral_events (zone_id, event_type, event_data, occupancy_count, timestamp)
SELECT 
  'z0000000-0000-0000-0000-000000000003',
  'occupancy_update',
  jsonb_build_object('source', 'synthetic', 'confidence', 0.95),
  18 + floor(random() * 8)::int,
  NOW() - (interval '1 hour' * generate_series)
FROM generate_series(0, 23);
