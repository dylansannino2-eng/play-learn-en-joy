import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WordBattleGame from "@/components/games/WordBattleGame";
import TheTranslatorGame from "@/components/games/TheTranslatorGame";
import TheMovieInterpreterGame from "@/components/games/TheMovieInterpreterGame";
import WordSearchGame from "@/components/games/WordSearchGame";
// IMPORTACIÓN AÑADIDA:
import MemoryGame from "@/components/games/MemoryGame";
import { supabase } from "@/integrations/supabase/client";

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

const GamePage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      case "word-search":
        return <WordSearchGame roomCode={roomCode} multiplayerEnabled={multiplayerEnabled} category={contentCategory} />;
      case "memorama":
        return <MemoryGame category={contentCategory} />;
      default:
        return (
          <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">{game.title}</h2>
              <p className="text-muted-foreground">Este juego estará disponible pronto</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Juego no encontrado</h1>
          <Link to="/" className="text-primary hover:underline">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-16 p-4 flex flex-col h-screen overflow-y-auto scrollbar-thin">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-4"
        >
          <ArrowLeft size={20} />
          <span>{game.title}</span>
        </Link>

        <div className="flex flex-col gap-6 pb-10">
          {/* El contenedor del juego */}
          <div className="flex gap-4 min-h-[600px] w-full">{renderGameComponent()}</div>

          <section className="w-full">
            <div className="max-w-3xl bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Info className="text-primary h-5 w-5" />
                <h3 className="text-xl font-bold text-foreground">Sobre este juego</h3>
              </div>

              <div className="text-muted-foreground">
                {game.description ? (
                  <p className="whitespace-pre-line leading-relaxed text-sm md:text-base">{game.description}</p>
                ) : (
                  <p className="italic opacity-50">No hay descripción disponible para este juego.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default GamePage;
