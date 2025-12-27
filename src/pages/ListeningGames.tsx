import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
// Asumiré que tienes un componente GameCard, si no, mira la nota abajo*
import GameCard from "@/components/GameCard"; 
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom"; // O tu sistema de rutas

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  badge: "new" | "hot" | "top" | "updated" | null;
  category: string;
}

const ListeningGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchListeningGames = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image, slug, badge, category")
        .eq("is_active", true)
        // ⚠️ IMPORTANTE: Aquí filtramos solo los de Listening.
        // Asegúrate de que en tu base de datos la columna 'category' 
        // o una columna nueva 'skill_type' tenga el valor 'listening'.
        .eq("category", "listening") 
        .order("sort_order");

      if (!error && data) {
        setGames(data as Game[]);
      }
      setIsLoading(false);
    };

    fetchListeningGames();
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
              🎧 Juegos de Listening
            </h1>
            <p className="text-muted-foreground mt-1">
              Mejora tu comprensión auditiva con estos juegos seleccionados.
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
            <p>No se encontraron juegos de Listening por el momento.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ListeningGames;
