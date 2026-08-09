-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location as a Geography POINT to dealers table
ALTER TABLE dealers
ADD COLUMN location geography(POINT, 4326);
