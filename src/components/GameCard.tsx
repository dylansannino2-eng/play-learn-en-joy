import { cn } from "@/lib/utils";
import { Flame, Star, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface GameCardProps {
  id: string;
  slug?: string;
  title: string;
  image: string;
  badge?: "new" | "hot" | "top" | "updated" | null;
  delay?: number;
}

const badgeConfig = {
  new: {
    label: "New",
    icon: Sparkles,
    className: "bg-badge-new text-foreground",
  },
  hot: {
    label: "Hot",
    icon: Flame,
    className: "bg-badge-hot text-foreground",
  },
  top: {
    label: "Top",
    icon: Star,
    className: "bg-badge-top text-accent-foreground",
  },
  updated: {
    label: "Updated",
    icon: RefreshCw,
    className: "bg-badge-updated text-accent-foreground",
  },
};

const GameCard = ({ id, slug, title, image, badge, delay = 0 }: GameCardProps) => {
  const BadgeIcon = badge ? badgeConfig[badge].icon : null;
  const gameUrl = slug ? `/game/${slug}` : `/game/${id}`;
  
  return (
    <Link 
      to={gameUrl}
      className="group relative flex-shrink-0 w-52 cursor-pointer animate-slide-in block"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-card">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {badge && (
          <div className={cn(
            "absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg",
            badgeConfig[badge].className
          )}>
            {BadgeIcon && <BadgeIcon size={12} />}
            {badgeConfig[badge].label}
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm transition-colors">
            Jugar Ahora
          </button>
        </div>
      </div>
      
      <h3 className="mt-2 font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
        {title}
      </h3>
    </Link>
  );
};

export default GameCard;
