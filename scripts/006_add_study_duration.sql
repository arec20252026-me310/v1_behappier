-- Add planned_duration_minutes to studies table
-- Duration is stored in minutes to support the full range: 5 minutes to 12 weeks (120,960 minutes)

ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER;
