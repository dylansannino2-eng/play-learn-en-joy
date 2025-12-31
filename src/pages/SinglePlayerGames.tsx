import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import GameCard from "@/components/GameCard"; 
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User } from "lucide-react"; // Icono de un solo usuario
import { Link } from "react-router-dom";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  badge: "new" | "hot" | "top" | "updated" | null;
  category: string;
}

const SinglePlayerGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSinglePlayerGames = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image, slug, badge, category, categories")
        .eq("is_active", true)
        // Filtramos por la categoría 'singleplayer'
        .contains("categories", ["singleplayer"])
        .order("sort_order");

      if (!error && data) {
        setGames(data as Game[]);
      }
      setIsLoading(false);
    };

    fetchSinglePlayerGames();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-16 pt-20 px-6 pb-8 space-y-8">
        {/* Cabecera de la Sección */}
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="w-8 h-8 text-primary" /> Modo Single Player
            </h1>
            <p className="text-muted-foreground mt-1">
              Entrena a tu propio ritmo y supera tus desafíos personales.
            </p>
          </div>
        </div>

        {/* 🎮 Grid de Juegos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {games.map((game) => (
              <GameCard 
                key={game.id} 
                id={game.id}
                slug={game.slug ?? undefined}
                title={game.title}
                image={game.image}
                badge={game.badge}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p>No se encontraron juegos individuales en este momento.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SinglePlayerGames;
