import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WordBattleGame from "@/components/games/WordBattleGame";
import TheTranslatorGame from "@/components/games/TheTranslatorGame";
import TheMovieInterpreterGame from "@/components/games/TheMovieInterpreterGame";
import { supabase } from "@/integrations/supabase/client";

// ... (Interface se mantiene igual)

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

      if (!error && data) setGame(data);
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
          <div className="flex-1 bg-card rounded-xl border border-border flex items-center justify-center min-h-[300px] p-6 text-center">
            <div>
              <h2 className="text-xl font-bold mb-2">{game.title}</h2>
              <p className="text-muted-foreground">Próximamente</p>
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
      <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Juego no encontrado</h1>
        <Link to="/" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft size={18} /> Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar: Asegúrate que tu Sidebar tenga clases como 'hidden md:flex' o sea responsiva */}
      <Sidebar />

      {/* Main Container: 
          - md:ml-16 quita el solapamiento con la sidebar en escritorio.
          - pb-20 o pb-24 en móvil por si la sidebar es un bottom-nav.
      */}
      <main className="flex-1 w-full md:ml-16 h-screen overflow-y-auto scrollbar-none md:scrollbar-thin flex flex-col">
        {/* Header/Nav: Padding reducido en móvil */}
        <header className="p-4 md:p-6 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-none">
              {game.title}
            </span>
          </Link>
        </header>

        {/* Content Area */}
        <div className="flex-1 px-3 md:px-8 pb-24 md:pb-10 max-w-7xl mx-auto w-full space-y-6">
          {/* 1. Área de Juego: 
              - Cambiamos de flex a block o mantenemos flex-col. 
              - Importante: Los juegos dentro deben tener w-full.
          */}
          <section className="w-full flex flex-col gap-4">
            <div className="w-full min-h-[450px] md:min-h-[600px] flex">{renderGameComponent()}</div>
          </section>

          {/* 2. Sección de Información: 
              - En móvil ocupa el 100%, en desktop se limita el ancho para lectura.
          */}
          <section className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-full lg:max-w-4xl bg-card border border-border rounded-2xl p-5 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Info className="text-primary h-5 w-5" />
                </div>
                <h3 className="text-lg md:text-xl font-bold">Sobre este juego</h3>
              </div>

              <div className="text-muted-foreground border-t border-border/50 pt-4">
                {game.description ? (
                  <p className="whitespace-pre-line leading-relaxed text-sm md:text-base">{game.description}</p>
                ) : (
                  <p className="italic opacity-60 text-sm">Sin descripción disponible.</p>
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
