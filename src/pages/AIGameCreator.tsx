import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, AlertCircle, Swords, Languages, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GameType = "word_battle" | "translator" | "subtitle_config";

interface GeneratedItem {
  id: string;
  data: Record<string, unknown>;
  saved: boolean;
}

const gameTypeInfo = {
  word_battle: {
    label: "Word Battle Cards",
    description: "Tarjetas con pistas y respuestas para el juego de palabras",
    icon: Swords,
    color: "text-orange-500",
  },
  translator: {
    label: "Translator Phrases",
    description: "Frases en español con traducciones al inglés",
    icon: Languages,
    color: "text-blue-500",
  },
  subtitle_config: {
    label: "Subtitle Configs",
    description: "Configuraciones de video con subtítulos",
    icon: Film,
    color: "text-purple-500",
  },
};

const AIGameCreator = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [gameType, setGameType] = useState<GameType>("word_battle");
  const [quantity, setQuantity] = useState(5);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());

  const parseStreamedContent = useCallback((content: string): GeneratedItem[] => {
    try {
      // Try to find a valid JSON array in the content
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((item, index) => ({
            id: `item-${index}-${Date.now()}`,
            data: item,
            saved: false,
          }));
        }
      }
    } catch {
      // JSON not complete yet, that's ok
    }
    return [];
  }, []);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para usar esta función");
      navigate("/auth");
      return;
    }

    setIsGenerating(true);
    setStreamedContent("");
    setGeneratedItems([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No session found");
      }

      const response = await fetch(
        `https://nyhhqdreuihtcyrryvkr.supabase.co/functions/v1/generate-game-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            gameType,
            quantity,
            customPrompt: customPrompt || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Intenta de nuevo en unos minutos.");
        }
        if (response.status === 402) {
          throw new Error("Se requieren créditos adicionales para continuar.");
        }
        throw new Error(errorData.error || "Error generating content");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const jsonStr = line.slice(6);
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                setStreamedContent(fullContent);
                
                // Try to parse as we go
                const items = parseStreamedContent(fullContent);
                if (items.length > 0) {
                  setGeneratedItems(items);
                }
              }
            } catch {
              // Incomplete JSON, continue
            }
          }
        }
      }

      // Final parse
      const finalItems = parseStreamedContent(fullContent);
      if (finalItems.length > 0) {
        setGeneratedItems(finalItems);
        toast.success(`¡${finalItems.length} elementos generados!`);
      } else {
        toast.error("No se pudieron parsear los resultados");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Error al generar contenido");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveItem = async (item: GeneratedItem) => {
    setSavingItems((prev) => new Set(prev).add(item.id));

    try {
      let tableName: string;
      let insertData: Record<string, unknown>;

      switch (gameType) {
        case "word_battle":
          tableName = "word_battle_cards";
          insertData = {
            prompt: item.data.prompt,
            category: item.data.category,
            letter: item.data.letter,
            correct_answers: item.data.correct_answers,
            difficulty: item.data.difficulty,
            is_active: true,
          };
          break;
        case "translator":
          tableName = "translator_phrases";
          insertData = {
            spanish_text: item.data.spanish_text,
            english_translation: item.data.english_translation,
            difficulty: item.data.difficulty,
            category: item.data.category,
            is_active: true,
          };
          break;
        case "subtitle_config":
          tableName = "subtitle_configs";
          insertData = {
            name: item.data.name,
            video_id: item.data.video_id,
            start_time: item.data.start_time,
            end_time: item.data.end_time,
            subtitles: item.data.subtitles,
            translations: item.data.translations,
          };
          break;
        default:
          throw new Error("Unknown game type");
      }

      const { error } = await supabase.from(tableName as any).insert([insertData] as any);

      if (error) throw error;

      setGeneratedItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, saved: true } : i))
      );
      toast.success("Elemento guardado");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al guardar");
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const saveAllItems = async () => {
    const unsavedItems = generatedItems.filter((i) => !i.saved);
    for (const item of unsavedItems) {
      await saveItem(item);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />
        <main className="ml-16 pt-20 px-6 pb-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Acceso Requerido
              </CardTitle>
              <CardDescription>
                Debes iniciar sesión para crear contenido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Iniciar Sesión
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const GameIcon = gameTypeInfo[gameType].icon;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-16 pt-20 px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Crear Contenido</h1>
              <p className="text-muted-foreground">
                Genera contenido para tus juegos automáticamente
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Selecciona el tipo de contenido a generar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo de Juego</Label>
                  <Select
                    value={gameType}
                    onValueChange={(v) => setGameType(v as GameType)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(gameTypeInfo).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <info.icon className={`h-4 w-4 ${info.color}`} />
                            {info.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {gameTypeInfo[gameType].description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instrucciones adicionales (opcional)</Label>
                  <Textarea
                    placeholder="Ej: Enfócate en temas de tecnología y ciencia..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    disabled={isGenerating}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generar Contenido
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Real-time Preview Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GameIcon className={`h-5 w-5 ${gameTypeInfo[gameType].color}`} />
                      Resultado en Tiempo Real
                    </CardTitle>
                    <CardDescription>
                      {generatedItems.length > 0
                        ? `${generatedItems.length} elementos generados`
                        : "Los resultados aparecerán aquí"}
                    </CardDescription>
                  </div>
                  {generatedItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveAllItems}
                      disabled={generatedItems.every((i) => i.saved)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Guardar Todos
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating && streamedContent === "" && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                {isGenerating && streamedContent !== "" && generatedItems.length === 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-[400px]">
                    <pre className="whitespace-pre-wrap break-words">{streamedContent}</pre>
                  </div>
                )}

                {generatedItems.length > 0 && (
                  <div className="space-y-3 max-h-[500px] overflow-auto">
                    {generatedItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          item.saved
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {gameType === "word_battle" && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{String(item.data.letter)}</Badge>
                                  <Badge variant="secondary">{String(item.data.category)}</Badge>
                                  <Badge
                                    variant={
                                      item.data.difficulty === "easy"
                                        ? "default"
                                        : item.data.difficulty === "hard"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {String(item.data.difficulty)}
                                  </Badge>
                                </div>
                                <p className="font-medium">{String(item.data.prompt)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Respuestas: {(item.data.correct_answers as string[])?.join(", ")}
                                </p>
                              </div>
                            )}
                            {gameType === "translator" && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{String(item.data.category)}</Badge>
                                  <Badge
                                    variant={
                                      item.data.difficulty === "easy"
                                        ? "default"
                                        : item.data.difficulty === "hard"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {String(item.data.difficulty)}
                                  </Badge>
                                </div>
                                <p className="font-medium">{String(item.data.spanish_text)}</p>
                                <p className="text-sm text-muted-foreground">
                                  → {String(item.data.english_translation)}
                                </p>
                              </div>
                            )}
                            {gameType === "subtitle_config" && (
                              <div className="space-y-1">
                                <p className="font-medium">{String(item.data.name)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Video: {String(item.data.video_id)} ({String(item.data.start_time)}s -{" "}
                                  {String(item.data.end_time)}s)
                                </p>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={item.saved ? "ghost" : "default"}
                            disabled={item.saved || savingItems.has(item.id)}
                            onClick={() => saveItem(item)}
                          >
                            {savingItems.has(item.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : item.saved ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              "Guardar"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isGenerating && generatedItems.length === 0 && streamedContent === "" && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Configura los parámetros y haz clic en "Generar Contenido"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIGameCreator;
