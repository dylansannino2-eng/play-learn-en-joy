import { ChevronRight } from "lucide-react";
import GameCard from "./GameCard";

interface Game {
  id: number;
  title: string;
  image: string;
  badge?: "new" | "hot" | "top" | "updated";
}

interface GameSectionProps {
  title: string;
  games: Game[];
}

const GameSection = ({ title, games }: GameSectionProps) => {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-foreground">{title}</h2>
        <button className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
          Ver más
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {games.map((game, index) => (
          <GameCard 
            key={game.id}
            id={game.id}
            title={game.title} 
            image={game.image} 
            badge={game.badge}
            delay={index * 50}
          />
        ))}
      </div>
    </section>
  );
};

export default GameSection;
