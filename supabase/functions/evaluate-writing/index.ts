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
    const { word, sentence } = await req.json();

    if (!word || !sentence) {
      return new Response(
        JSON.stringify({ error: "Word and sentence are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an English writing evaluator for language learners. Your task is to evaluate sentences and provide scores.

You MUST respond ONLY with valid JSON in this exact format:
{
  "score": <number 1-100>,
  "feedback": {
    "extension": <number 1-100>,
    "naturalness": <number 1-100>,
    "grammar": <number 1-100>,
    "wordUsage": <boolean>
  },
  "comment": "<brief encouraging feedback in Spanish, max 2 sentences>"
}

Scoring criteria:
- extension (1-100): Length and completeness. Short simple sentences = 20-40, medium sentences = 40-70, well-developed sentences = 70-100
- naturalness (1-100): How natural and fluent the sentence sounds to a native speaker
- grammar (1-100): Grammatical correctness including punctuation and capitalization
- wordUsage (boolean): true if the target word is used correctly in context, false otherwise

The final "score" should be a weighted average: extension(20%) + naturalness(35%) + grammar(35%) + wordUsage bonus(10% if true)

Be encouraging but honest. Give specific, actionable feedback in Spanish.`;

    const userPrompt = `Target word: "${word}"
Sentence written: "${sentence}"

Evaluate this sentence and respond with the JSON only.`;

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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI evaluation failed");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the AI response
    let evaluation;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback evaluation
      evaluation = {
        score: 50,
        feedback: {
          extension: 50,
          naturalness: 50,
          grammar: 50,
          wordUsage: sentence.toLowerCase().includes(word.toLowerCase()),
        },
        comment: "¡Buen intento! Sigue practicando para mejorar tu escritura.",
      };
    }

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("evaluate-writing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
