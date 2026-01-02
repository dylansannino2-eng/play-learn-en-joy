-- Add multiplayer_enabled field to games table
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS multiplayer_enabled boolean DEFAULT true;