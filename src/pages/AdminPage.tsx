import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import GameSection from "@/components/GameSection";
import { supabase } from "@/integrations/supabase/client";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  badge: "new" | "hot" | "top" | "updated" | null;
  category: string;
}

const categoryConfig = {
  new: { title: "🆕 Juegos Nuevos" },
  popular: { title: "🔥 Los Más Populares" },
  multiplayer: { title: "👥 Juegos Multijugador" },
  brain: { title: "🧠 Juegos de Lógica" },
  ranking: { title: "🏆 Asciende en el Ranking" },
};

const skillCategories = [
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
];

const AdminPage = () => {
  const [gamesByCategory, setGamesByCategory] = useState<Record<string, Game[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image, slug, badge, category")
        .eq("is_active", true)
        .order("sort_order");

      if (!error && data) {
        const grouped = data.reduce(
          (acc, game) => {
            const category = game.category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(game as Game);
            return acc;
          },
          {} as Record<string, Game[]>,
        );

        setGamesByCategory(grouped);
      }

      setIsLoading(false);
    };

    fetchGames();
  }, []);

  const categories = ["new", "popular", "multiplayer", "brain", "ranking"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-16 pt-20 px-6 pb-8 space-y-12">
        {/* 🔹 SECCIÓN CATEGORÍAS */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Categorías de Aprendizaje</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {skillCategories.map((cat) => (
              <div
                key={cat.key}
                className="rounded-lg border bg-card p-4 text-center cursor-pointer hover:bg-accent transition"
              >
                <span className="text-lg font-medium">{cat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 🔹 SECCIONES DE JUEGOS */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          categories.map((category) => {
            const games = gamesByCategory[category];
            if (!games || games.length === 0) return null;

            return (
              <GameSection
                key={category}
                title={categoryConfig[category as keyof typeof categoryConfig].title}
                games={games}
              />
            );
          })
        )}
      </main>
    </div>
  );
};

export default AdminPage;
