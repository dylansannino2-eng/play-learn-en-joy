-- Create word_battle_cards table
CREATE TABLE public.word_battle_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  letter CHAR(1),
  correct_answers TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.word_battle_cards ENABLE ROW LEVEL SECURITY;

-- Cards are publicly readable (players need to see them)
CREATE POLICY "Word battle cards are publicly readable"
ON public.word_battle_cards
FOR SELECT
USING (is_active = true);

-- Admins can manage cards
CREATE POLICY "Admins can insert word battle cards"
ON public.word_battle_cards FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update word battle cards"
ON public.word_battle_cards FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete word battle cards"
ON public.word_battle_cards FOR DELETE
USING (public.is_admin());

-- Create indexes
CREATE INDEX idx_word_battle_cards_category ON public.word_battle_cards(category);
CREATE INDEX idx_word_battle_cards_letter ON public.word_battle_cards(letter);

-- Trigger for updated_at
CREATE TRIGGER update_word_battle_cards_updated_at
BEFORE UPDATE ON public.word_battle_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some example cards
INSERT INTO public.word_battle_cards (prompt, category, letter, correct_answers, difficulty) VALUES
('Food that starts with the letter A', 'food', 'A', ARRAY['apple', 'apricot', 'avocado', 'artichoke', 'asparagus', 'almond'], 'easy'),
('Animal that starts with the letter B', 'animals', 'B', ARRAY['bear', 'bird', 'butterfly', 'bee', 'bat', 'buffalo', 'beaver'], 'easy'),
('Color that starts with the letter G', 'colors', 'G', ARRAY['green', 'gold', 'gray', 'grey'], 'easy'),
('Country that starts with the letter S', 'countries', 'S', ARRAY['spain', 'sweden', 'switzerland', 'singapore', 'serbia', 'slovakia', 'slovenia', 'sudan', 'syria'], 'medium'),
('Profession that starts with the letter D', 'professions', 'D', ARRAY['doctor', 'dentist', 'driver', 'designer', 'developer', 'dancer', 'detective'], 'medium'),
('Fruit that starts with the letter M', 'food', 'M', ARRAY['mango', 'melon', 'mandarin', 'mulberry'], 'easy'),
('Sport that starts with the letter T', 'sports', 'T', ARRAY['tennis', 'table tennis', 'triathlon', 'track', 'taekwondo'], 'medium'),
('City that starts with the letter P', 'places', 'P', ARRAY['paris', 'prague', 'porto', 'perth', 'philadelphia', 'phoenix', 'portland'], 'hard');