-- Insert The Translator game
INSERT INTO public.games (title, image, badge, category, description, slug, sort_order, uses_chat, is_active)
VALUES (
  'The Translator',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
  'new',
  'new',
  'Traduce frases del español al inglés. ¡Demuestra tu dominio del idioma!',
  'the-translator',
  2,
  true,
  true
);

-- Create table for translator phrases
CREATE TABLE public.translator_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spanish_text TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translator_phrases ENABLE ROW LEVEL SECURITY;

-- Everyone can read active phrases
CREATE POLICY "Anyone can read active phrases"
ON public.translator_phrases
FOR SELECT
USING (is_active = true);

-- Only admins can manage phrases
CREATE POLICY "Admins can manage phrases"
ON public.translator_phrases
FOR ALL
USING (public.is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_translator_phrases_updated_at
BEFORE UPDATE ON public.translator_phrases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample phrases
INSERT INTO public.translator_phrases (spanish_text, english_translation, difficulty, category) VALUES
('Hola, ¿cómo estás?', 'Hello, how are you?', 'easy', 'greetings'),
('Buenos días', 'Good morning', 'easy', 'greetings'),
('Gracias por tu ayuda', 'Thank you for your help', 'easy', 'courtesy'),
('¿Dónde está el baño?', 'Where is the bathroom?', 'easy', 'questions'),
('Me gustaría un café, por favor', 'I would like a coffee, please', 'medium', 'food'),
('El tiempo vuela cuando te diviertes', 'Time flies when you are having fun', 'medium', 'expressions'),
('Más vale tarde que nunca', 'Better late than never', 'medium', 'proverbs'),
('No hay mal que por bien no venga', 'Every cloud has a silver lining', 'hard', 'proverbs'),
('A quien madruga, Dios le ayuda', 'The early bird catches the worm', 'hard', 'proverbs'),
('Estoy aprendiendo a programar', 'I am learning to code', 'medium', 'activities');