-- Home Assistant Bridge: Storage bucket and snapshot tracking
-- This migration creates the infrastructure for connecting Home Assistant cameras to OccupancyIQ

-- Create storage bucket for camera snapshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'camera-snapshots',
  'camera-snapshots',
  false,
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for camera snapshots bucket
CREATE POLICY "Allow authenticated uploads to camera-snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'camera-snapshots');

CREATE POLICY "Allow authenticated reads from camera-snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'camera-snapshots');

CREATE POLICY "Allow service role full access to camera-snapshots"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'camera-snapshots')
WITH CHECK (bucket_id = 'camera-snapshots');

-- Table to track camera snapshots from Home Assistant
CREATE TABLE IF NOT EXISTS camera_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  -- Home Assistant specific fields
  ha_entity_id TEXT,
  ha_event_type TEXT, -- 'periodic', 'motion', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by camera and time
CREATE INDEX idx_camera_snapshots_camera_time ON camera_snapshots(camera_id, captured_at DESC);
CREATE INDEX idx_camera_snapshots_ha_entity ON camera_snapshots(ha_entity_id);

-- Table to store Home Assistant entity mappings
CREATE TABLE IF NOT EXISTS ha_camera_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
  ha_entity_id TEXT NOT NULL UNIQUE,
  ha_friendly_name TEXT,
  ha_device_class TEXT,
  snapshot_interval_seconds INTEGER DEFAULT 300, -- 5 minutes default
  is_active BOOLEAN DEFAULT true,
  last_snapshot_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by HA entity
CREATE INDEX idx_ha_camera_mappings_entity ON ha_camera_mappings(ha_entity_id);

-- Table to log webhook events from Home Assistant
CREATE TABLE IF NOT EXISTS ha_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unprocessed events
CREATE INDEX idx_ha_webhook_logs_unprocessed ON ha_webhook_logs(processed) WHERE NOT processed;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ha_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS ha_camera_mappings_updated_at ON ha_camera_mappings;
CREATE TRIGGER ha_camera_mappings_updated_at
  BEFORE UPDATE ON ha_camera_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_ha_mapping_timestamp();
