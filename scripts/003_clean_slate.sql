-- Delete all data to start fresh
-- This will remove all spaces, zones, studies, metrics, and related data

-- Delete behavioral events
DELETE FROM behavioral_events;

-- Delete metric aggregations
DELETE FROM metric_aggregations;

-- Delete insights
DELETE FROM insights;

-- Delete agent conversations
DELETE FROM agent_conversations;

-- Delete studies
DELETE FROM studies;

-- Delete user-created metrics
DELETE FROM metrics WHERE category NOT IN ('traffic_flow', 'utilization', 'social_interaction', 'comfort', 'safety');

-- Delete zones
DELETE FROM zones;

-- Delete cameras
DELETE FROM cameras;

-- Delete spaces
DELETE FROM spaces;

-- Delete camera snapshots and mappings
DELETE FROM camera_snapshots;
DELETE FROM ha_camera_mappings;
DELETE FROM ha_webhook_logs;
