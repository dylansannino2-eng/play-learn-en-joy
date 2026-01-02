import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Info, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import WordBattleGame from "@/components/games/WordBattleGame";
import TheTranslatorGame from "@/components/games/TheTranslatorGame";
import TheMovieInterpreterGame from "@/components/games/TheMovieInterpreterGame";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  description: string | null;
  uses_chat: boolean;
  microlessons_enabled: boolean;
  multiplayer_enabled: boolean;
  base_game_slug: string | null;
  content_category: string | null;
}

const GamePageMobile = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const roomCode = searchParams.get("room") || undefined;

  useEffect(() => {
    const fetchGame = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("games")
        .select("id, title, image, slug, description, uses_chat, microlessons_enabled, multiplayer_enabled, base_game_slug, content_category")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setGame(data);
      }
      setIsLoading(false);
    };

    fetchGame();
  }, [slug]);

  const renderGameComponent = () => {
    if (!game?.slug) return null;

    const microlessonsEnabled = game.microlessons_enabled ?? true;
    const multiplayerEnabled = game.multiplayer_enabled ?? true;
    // Use base_game_slug if it's a variant, otherwise use the game's own slug
    const gameToRender = game.base_game_slug || game.slug;
    // Use content_category from the game record
    const contentCategory = game.content_category || undefined;

    switch (gameToRender) {
      case "word-battle":
        return <WordBattleGame roomCode={roomCode} microlessonsEnabled={microlessonsEnabled} multiplayerEnabled={multiplayerEnabled} category={contentCategory} />;
      case "the-translator":
        return <TheTranslatorGame roomCode={roomCode} microlessonsEnabled={microlessonsEnabled} multiplayerEnabled={multiplayerEnabled} category={contentCategory} />;
      case "the-movie-interpreter":
        return <TheMovieInterpreterGame roomCode={roomCode} microlessonsEnabled={microlessonsEnabled} multiplayerEnabled={multiplayerEnabled} category={contentCategory} />;
      default:
        return (
          <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex items-center justify-center min-h-[300px]">
            <div className="text-center p-4">
              <h2 className="text-xl font-bold text-foreground mb-2">{game.title}</h2>
              <p className="text-muted-foreground text-sm">Este juego estará disponible pronto</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">Juego no encontrado</h1>
          <Link to="/" className="text-primary hover:underline">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header compacto */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-medium text-sm truncate max-w-[250px]">{game.title}</span>
        </Link>
      </header>

      {/* Contenido principal - ocupa todo el espacio */}
      <main className="flex-1 flex flex-col p-2 pb-4 overflow-y-auto">
        {/* Área de juego */}
        <div className="flex-1 min-h-0">
          {renderGameComponent()}
        </div>

        {/* Descripción colapsable */}
        {game.description && (
          <Collapsible
            open={descriptionOpen}
            onOpenChange={setDescriptionOpen}
            className="mt-3"
          >
            <CollapsibleTrigger className="w-full bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="text-primary h-4 w-4" />
                <span className="text-sm font-medium text-foreground">Sobre este juego</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  descriptionOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {game.description}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </main>
    </div>
  );
};

export default GamePageMobile;
