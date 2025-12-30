-- Add microlessons_enabled column to games table
ALTER TABLE public.games 
ADD COLUMN microlessons_enabled boolean NOT NULL DEFAULT true;