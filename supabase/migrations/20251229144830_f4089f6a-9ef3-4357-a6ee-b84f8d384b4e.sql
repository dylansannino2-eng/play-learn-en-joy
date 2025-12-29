-- Create table for microlessons
CREATE TABLE public.microlessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  meaning TEXT NOT NULL,
  examples TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  difficulty TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.microlessons ENABLE ROW LEVEL SECURITY;

-- Public read access (microlessons are public educational content)
CREATE POLICY "Anyone can view microlessons"
ON public.microlessons
FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert microlessons"
ON public.microlessons
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update microlessons"
ON public.microlessons
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete microlessons"
ON public.microlessons
FOR DELETE
USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_microlessons_updated_at
BEFORE UPDATE ON public.microlessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default microlessons from the existing dictionary
INSERT INTO public.microlessons (word, meaning, examples) VALUES
('can''t', 'Contracción de ''cannot''. Expresa incapacidad o prohibición.', ARRAY['I can''t swim. (No puedo nadar)', 'You can''t park here. (No puedes estacionar aquí)']),
('don''t', 'Contracción de ''do not''. Se usa para negar acciones.', ARRAY['I don''t like coffee. (No me gusta el café)', 'Don''t worry! (¡No te preocupes!)']),
('won''t', 'Contracción de ''will not''. Expresa negación en futuro.', ARRAY['It won''t rain today. (No lloverá hoy)', 'I won''t forget. (No olvidaré)']),
('i''m', 'Contracción de ''I am''. Primera persona del verbo ''to be''.', ARRAY['I''m happy. (Estoy feliz)', 'I''m learning English. (Estoy aprendiendo inglés)']),
('you''re', 'Contracción de ''you are''. Segunda persona del verbo ''to be''.', ARRAY['You''re amazing! (¡Eres increíble!)', 'You''re welcome. (De nada)']),
('it''s', 'Contracción de ''it is''. Tercera persona para cosas/situaciones.', ARRAY['It''s raining. (Está lloviendo)', 'It''s a great idea! (¡Es una gran idea!)']),
('they''re', 'Contracción de ''they are''. Tercera persona plural del verbo ''to be''.', ARRAY['They''re coming. (Están viniendo)', 'They''re my friends. (Son mis amigos)']),
('we''re', 'Contracción de ''we are''. Primera persona plural del verbo ''to be''.', ARRAY['We''re ready! (¡Estamos listos!)', 'We''re going home. (Vamos a casa)']),
('that''s', 'Contracción de ''that is''. Se usa para señalar o explicar.', ARRAY['That''s correct. (Eso es correcto)', 'That''s my car. (Ese es mi carro)']),
('what''s', 'Contracción de ''what is''. Se usa para preguntar.', ARRAY['What''s your name? (¿Cuál es tu nombre?)', 'What''s happening? (¿Qué está pasando?)']),
('there''s', 'Contracción de ''there is''. Indica existencia de algo.', ARRAY['There''s a problem. (Hay un problema)', 'There''s hope. (Hay esperanza)']),
('here''s', 'Contracción de ''here is''. Se usa para presentar algo.', ARRAY['Here''s your coffee. (Aquí está tu café)', 'Here''s the plan. (Aquí está el plan)']),
('let''s', 'Contracción de ''let us''. Se usa para hacer sugerencias.', ARRAY['Let''s go! (¡Vamos!)', 'Let''s try again. (Intentemos de nuevo)']),
('couldn''t', 'Contracción de ''could not''. Expresa incapacidad en pasado.', ARRAY['I couldn''t sleep. (No pude dormir)', 'She couldn''t find it. (No pudo encontrarlo)']),
('wouldn''t', 'Contracción de ''would not''. Expresa negación condicional.', ARRAY['He wouldn''t listen. (Él no escucharía)', 'I wouldn''t do that. (Yo no haría eso)']),
('shouldn''t', 'Contracción de ''should not''. Expresa consejo negativo.', ARRAY['You shouldn''t worry. (No deberías preocuparte)', 'We shouldn''t be late. (No deberíamos llegar tarde)']),
('haven''t', 'Contracción de ''have not''. Se usa en tiempos perfectos.', ARRAY['I haven''t finished. (No he terminado)', 'They haven''t arrived. (No han llegado)']),
('hasn''t', 'Contracción de ''has not''. Tercera persona en tiempo perfecto.', ARRAY['She hasn''t called. (Ella no ha llamado)', 'It hasn''t stopped. (No ha parado)']),
('didn''t', 'Contracción de ''did not''. Negación en pasado simple.', ARRAY['I didn''t know. (No sabía)', 'They didn''t come. (No vinieron)']),
('isn''t', 'Contracción de ''is not''. Negación del verbo ''to be''.', ARRAY['It isn''t true. (No es verdad)', 'She isn''t here. (Ella no está aquí)']),
('aren''t', 'Contracción de ''are not''. Plural de ''is not''.', ARRAY['They aren''t ready. (No están listos)', 'We aren''t sure. (No estamos seguros)']),
('wasn''t', 'Contracción de ''was not''. Negación en pasado.', ARRAY['It wasn''t me. (No fui yo)', 'She wasn''t there. (Ella no estaba ahí)']),
('weren''t', 'Contracción de ''were not''. Plural de ''was not''.', ARRAY['They weren''t happy. (No estaban felices)', 'We weren''t invited. (No fuimos invitados)']);