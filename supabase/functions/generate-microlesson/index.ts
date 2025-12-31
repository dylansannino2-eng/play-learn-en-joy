import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, context } = await req.json();

    if (!word) {
      throw new Error("word is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un profesor de inglés experto. Genera una microlección educativa para una palabra en inglés.

IMPORTANTE: Debes considerar el CONTEXTO específico donde aparece la palabra para dar el significado correcto.
Por ejemplo, "over" puede significar "encima de", "terminado", "más de", etc. dependiendo del contexto.

Responde SOLO con un JSON válido (sin markdown ni explicaciones) con esta estructura exacta:
{
  "meaning": "Significado de la palabra EN ESTE CONTEXTO específico. Explica brevemente en español (máximo 2 oraciones).",
  "examples": [
    "Ejemplo 1 en inglés. (Traducción al español)",
    "Ejemplo 2 en inglés. (Traducción al español)"
  ]
}

Los ejemplos deben ser similares al contexto dado para reforzar el aprendizaje.`;

    const userPrompt = context 
      ? `Palabra: "${word}"\nContexto (frase donde aparece): "${context}"\n\nGenera la microlección considerando cómo se usa la palabra en este contexto específico.`
      : `Palabra: "${word}"\n\nGenera una microlección general para esta palabra.`;

    console.log("Generating microlesson for:", word, "context:", context);

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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let microlesson;
    try {
      // Clean any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      microlesson = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    console.log("Generated microlesson:", microlesson);

    return new Response(JSON.stringify(microlesson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-microlesson error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
