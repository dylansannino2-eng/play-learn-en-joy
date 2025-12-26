import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, Star, ThumbsUp } from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WordBattleGame from "@/components/games/WordBattleGame";
import TheTranslatorGame from "@/components/games/TheTranslatorGame";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  description: string | null;
  uses_chat: boolean;
  category?: string; // Agregado para usar en breadcrumbs
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
        .select("id, title, image, slug, description, uses_chat, category")
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
      default:
        return (
          <div className="w-full aspect-video bg-card rounded-xl border border-border overflow-hidden flex items-center justify-center">
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

  // Datos simulados para replicar el diseño (ya que no están en la DB todavía)
  const mockTags = [
    ".io",
    "Sandbox",
    "Móviles",
    "Parkour",
    "Minecraft",
    "Saltar",
    "Disparos",
    "Construcción",
    "Multijugador",
  ];

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />

      {/* Cambiado: overflow-y-auto para permitir scroll en toda la página */}
      <main className="flex-1 ml-16 flex flex-col h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {/* Back button */}
          <div className="mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
              <span>Volver al catálogo</span>
            </Link>
          </div>

          {/* Game Container */}
          <div className="w-full mb-8">{renderGameComponent()}</div>

          {/* New Description Section (Estilo Screenshot) */}
          <div className="w-full space-y-6 pb-12">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">
                Juegos
              </Link>
              <span>»</span>
              <span className="capitalize text-primary">{game.category || "General"}</span>
              <span>»</span>
              <span className="text-foreground font-medium">{game.title}</span>
            </div>

            {/* Title & Share Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-4xl font-extrabold tracking-tight">{game.title}</h1>
              <Button variant="secondary" className="gap-2 w-fit rounded-full bg-secondary/50 hover:bg-secondary">
                <Share2 size={16} />
                Compartir
              </Button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-muted-foreground">Desarrollador:</span>
                  <span className="text-primary font-medium cursor-pointer hover:underline">Admin</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-muted-foreground">Clasificación:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-lg">8,5</span>
                    <div className="flex text-yellow-500">
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" className="opacity-50" />
                    </div>
                    <span className="text-xs text-muted-foreground">(1.296.181 votos)</span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-muted-foreground">Publicado en:</span>
                  <span className="text-foreground">marzo de 2024</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-muted-foreground">Tecnología:</span>
                  <span className="font-medium text-foreground">React / HTML5</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-muted-foreground mt-1">Plataformas:</span>
                  <span className="text-foreground">Browser (desktop, mobile, tablet)</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-muted-foreground">Descripción:</span>
                  <span className="text-muted-foreground line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                    {game.description || "Sin descripción disponible."}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="pt-4">
              <div className="flex flex-wrap gap-2">
                {mockTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm font-normal bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-colors flex items-center justify-between gap-2 min-w-[80px]"
                  >
                    <span>{tag}</span>
                    <span className="text-xs text-primary/70">{Math.floor(Math.random() * 200)}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GamePage;
