import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WordBattleGame from "@/components/games/WordBattleGame";
import TheTranslatorGame from "@/components/games/TheTranslatorGame";
import TheMovieInterpreterGame from "@/components/games/TheMovieInterpreterGame";
import { supabase } from "@/integrations/supabase/client";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  description: string | null;
  uses_chat: boolean;
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
        .select("id, title, image, slug, description, uses_chat")
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

    switch (game.slug) {
      case "word-battle":
        return <WordBattleGame roomCode={roomCode} />;
      case "the-translator":
        return <TheTranslatorGame roomCode={roomCode} />;
      case "the-movie-interpreter":
        return <TheMovieInterpreterGame roomCode={roomCode} />;
      default:
        return (
          <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex items-center justify-center min-h-[300px] md:min-h-[400px] p-6 text-center">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">{game.title}</h2>
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
      <div className="h-screen bg-background flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4">Juego no encontrado</h1>
          <Link to="/" className="text-primary hover:underline inline-flex items-center gap-2">
            <ArrowLeft size={18} /> Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar - Se asume que internamente maneja su visibilidad o es fijo */}
      <Sidebar />

      {/* Main Container: ml-0 en móvil, ml-16 en desktop */}
      <main className="flex-1 ml-0 md:ml-16 p-3 md:p-6 flex flex-col h-screen overflow-y-auto scrollbar-thin">
        {/* Botón de volver y título */}
        <div className="shrink-0 mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium truncate max-w-[200px] md:max-w-none">{game.title}</span>
          </Link>
        </div>

        {/* Contenido principal */}
        <div className="flex flex-col gap-6 pb-10 w-full max-w-7xl mx-auto">
          {/* 1. Área de Juego (Adaptable) 
              En móvil el min-h se reduce para que no rompa el viewport */}
          <div className="flex flex-col lg:flex-row gap-4 min-h-[500px] md:min-h-[600px] w-full">
            {renderGameComponent()}
          </div>

          {/* 2. Sección de Descripción */}
          <section className="w-full">
            <div className="w-full lg:max-w-3xl bg-card border border-border rounded-xl p-5 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Info className="text-primary h-5 w-5" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground">Sobre este juego</h3>
              </div>

              <div className="text-muted-foreground">
                {game.description ? (
                  <p className="whitespace-pre-line leading-relaxed text-sm md:text-base">{game.description}</p>
                ) : (
                  <p className="italic opacity-50 text-sm">No hay descripción disponible para este juego.</p>
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
