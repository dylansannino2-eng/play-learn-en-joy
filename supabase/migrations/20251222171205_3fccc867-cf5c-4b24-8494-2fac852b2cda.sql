-- Create game_rooms table
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code CHAR(4) NOT NULL UNIQUE,
  game_slug TEXT NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER NOT NULL DEFAULT 10,
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 5,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Rooms are publicly readable (players need to join)
CREATE POLICY "Game rooms are publicly readable"
ON public.game_rooms
FOR SELECT
USING (true);

-- Anyone can create a room
CREATE POLICY "Anyone can create rooms"
ON public.game_rooms
FOR INSERT
WITH CHECK (true);

-- Host can update their room
CREATE POLICY "Host can update room"
ON public.game_rooms
FOR UPDATE
USING (host_id = auth.uid() OR host_id IS NULL);

-- Host can delete their room
CREATE POLICY "Host can delete room"
ON public.game_rooms
FOR DELETE
USING (host_id = auth.uid() OR host_id IS NULL);

-- Create index for code lookups
CREATE INDEX idx_game_rooms_code ON public.game_rooms(code);
CREATE INDEX idx_game_rooms_game_slug ON public.game_rooms(game_slug);
CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);

-- Trigger for updated_at
CREATE TRIGGER update_game_rooms_updated_at
BEFORE UPDATE ON public.game_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique 4-character room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS CHAR(4)
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result CHAR(4);
  i INTEGER;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.game_rooms WHERE code = result) THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$;