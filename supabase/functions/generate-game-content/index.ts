import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GameType = "word_battle" | "translator" | "subtitle_config";

const getSystemPrompt = (gameType: GameType, quantity: number): string => {
  switch (gameType) {
    case "word_battle":
      return `Eres un generador de tarjetas para el juego Word Battle. Genera exactamente ${quantity} tarjetas de juego.
Cada tarjeta debe tener:
- prompt: Una pregunta o pista en inglés (ej: "A fruit that is yellow")
- category: Una categoría en inglés (ej: "Food", "Animals", "Sports", "Science", "Geography", "Movies", "Music")
- letter: Una letra mayúscula que debe iniciar la respuesta (A-Z)
- correct_answers: Array de 2-5 respuestas correctas en inglés que empiecen con esa letra
- difficulty: "easy", "medium" o "hard"

Responde SOLO con un JSON array válido, sin markdown ni explicaciones.
Ejemplo: [{"prompt":"A color of the sky","category":"Nature","letter":"B","correct_answers":["Blue","Baby blue"],"difficulty":"easy"}]`;

    case "translator":
      return `Eres un generador de frases para el juego The Translator. Genera exactamente ${quantity} frases.
Cada frase debe tener:
- spanish_text: Una frase en español (natural, coloquial)
- english_translation: La traducción correcta al inglés
- difficulty: "easy", "medium" o "hard"
- category: Una categoría (ej: "Saludos", "Comida", "Viajes", "Trabajo", "Emociones")

Responde SOLO con un JSON array válido, sin markdown ni explicaciones.
Ejemplo: [{"spanish_text":"¿Cómo estás hoy?","english_translation":"How are you today?","difficulty":"easy","category":"Saludos"}]`;

    case "subtitle_config":
      return `Eres un generador de configuraciones de subtítulos para el juego The Movie Interpreter. Genera exactamente ${quantity} configuraciones.
Cada configuración debe tener:
- name: Nombre descriptivo del clip
- video_id: Un ID de video de YouTube popular (usa IDs reales de videos en inglés)
- start_time: Tiempo de inicio en segundos (número)
- end_time: Tiempo de fin en segundos (número, máximo 30 segundos después del inicio)
- subtitles: Array de objetos con {start: segundos, end: segundos, text: "texto en inglés"}
- translations: Array de traducciones al español en el mismo orden

Los subtítulos deben ser 3-5 líneas de diálogo cortas y claras.
Responde SOLO con un JSON array válido, sin markdown ni explicaciones.`;

    default:
      return "";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameType, quantity = 5, customPrompt } = await req.json();

    if (!gameType) {
      throw new Error("gameType is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(gameType as GameType, quantity);
    const userPrompt = customPrompt || `Genera ${quantity} elementos variados y creativos para el juego.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("generate-game-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
