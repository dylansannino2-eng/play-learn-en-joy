import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // 👈 Importante: Importar Link
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

const learningCategories = [
  { key: "listening", label: "🎧 Listening" },
  { key: "speaking", label: "🗣️ Speaking" },
  { key: "reading", label: "📖 Reading" },
  { key: "writing", label: "✍️ Writing" },
];

const Index = () => {
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
        {/* 🟦 Learning Categories Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">📚 Categorías</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {learningCategories.map((cat) => (
              /* 👇 Envolvemos la tarjeta con Link usando la ruta dinámica */
              <Link to={`/${cat.key}`} key={cat.key} className="block hover:no-underline">
                <div className="flex items-center justify-center h-24 rounded-xl bg-card border border-border text-lg font-semibold hover:bg-muted transition cursor-pointer shadow-sm hover:shadow-md">
                  {cat.label}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 🎮 Games Sections */}
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

export default Index;
