import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react"; // 👈 Agregué el icono Info
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

  // Get room code from URL
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

      {/* 👇 CAMBIO IMPORTANTE: overflow-y-auto en lugar de overflow-hidden para permitir scroll vertical */}
      <main className="flex-1 ml-16 p-4 flex flex-col h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-4"
        >
          <ArrowLeft size={20} />
          <span>{game.title}</span>
        </Link>

        {/* Contenedor Vertical */}
        <div className="flex flex-col gap-8 pb-10">
          {/* 1. Área del Juego (Mantiene altura mínima para que se vea bien) */}
          <div className="flex gap-4 flex-1 min-h-[600px] w-full">{renderGameComponent()}</div>

          {/* 2. 👇 Nueva Sección: Descripción del Juego */}
          <section className="max-w-4xl mx-auto w-full">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Info className="text-primary h-5 w-5" />
                <h3 className="text-xl font-bold text-foreground">Sobre este juego</h3>
              </div>

              <div className="prose prose-invert max-w-none text-muted-foreground">
                {game.description ? (
                  /* whitespace-pre-line respeta los saltos de línea de la base de datos */
                  <p className="whitespace-pre-line leading-relaxed">{game.description}</p>
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
