import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import GameSection from "@/components/GameSection";
import { newGames, popularGames, multiplayerGames, brainGames, rankingGames } from "@/data/games";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-16 pt-20 px-6 pb-8">
        <GameSection title="🆕 Juegos Nuevos" games={newGames} />
        <GameSection title="🔥 Los Más Populares" games={popularGames} />
        <GameSection title="👥 Juegos Multijugador" games={multiplayerGames} />
        <GameSection title="🧠 Juegos de Lógica" games={brainGames} />
        <GameSection title="🏆 Asciende en el Ranking" games={rankingGames} />
      </main>
    </div>
  );
};

export default Index;
