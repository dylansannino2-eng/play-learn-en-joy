-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  badge TEXT CHECK (badge IN ('new', 'hot', 'top', 'updated')),
  category TEXT NOT NULL CHECK (category IN ('new', 'popular', 'multiplayer', 'brain', 'ranking')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Games are publicly readable (anyone can see the game catalog)
CREATE POLICY "Games are publicly readable"
ON public.games
FOR SELECT
USING (is_active = true);

-- Create index for category filtering
CREATE INDEX idx_games_category ON public.games(category);
CREATE INDEX idx_games_sort_order ON public.games(sort_order);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();