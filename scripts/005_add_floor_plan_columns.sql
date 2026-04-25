-- Add floor plan and grid resolution columns to spaces table
-- This migration adds support for floor plan image uploads and configurable grid density

ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS floor_plan_url TEXT,
ADD COLUMN IF NOT EXISTS grid_resolution INTEGER DEFAULT 8;

-- Add comment for documentation
COMMENT ON COLUMN spaces.floor_plan_url IS 'URL to the uploaded floor plan image (stored in Vercel Blob)';
COMMENT ON COLUMN spaces.grid_resolution IS 'Grid resolution for zone placement (4-32, default 8)';
