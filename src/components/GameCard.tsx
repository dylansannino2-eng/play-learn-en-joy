import { cn } from "@/lib/utils";
import { Flame, Star, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface GameCardProps {
  id: string;
  slug?: string;
  title: string;
  image?: string;
  badge?: "new" | "hot" | "top" | "updated" | null;
  delay?: number;
}

const badgeConfig = {
  new: { label: "New", icon: Sparkles, className: "bg-badge-new" },
  hot: { label: "Hot", icon: Flame, className: "bg-badge-hot" },
  top: { label: "Top", icon: Star, className: "bg-badge-top" },
  updated: { label: "Updated", icon: RefreshCw, className: "bg-badge-updated" },
};

const GameCard = ({ id, slug, title, badge, delay = 0 }: GameCardProps) => {
  const BadgeIcon = badge ? badgeConfig[badge].icon : null;
  const gameUrl = slug ? `/game/${slug}` : `/game/${id}`;

  return (
    <Link
      to={gameUrl}
      className="group relative w-56 flex-shrink-0 animate-slide-in block"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="
          relative h-72 rounded-2xl bg-[#fafafa]
          border-2 border-muted
          shadow-md
          p-4
          flex flex-col justify-between
          transition-all duration-300
          group-hover:shadow-xl
          group-hover:-translate-y-1
        "
      >
        {/* Badge */}
        {badge && (
          <div
            className={cn(
              "absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1",
              badgeConfig[badge].className,
            )}
          >
            {BadgeIcon && <BadgeIcon size={12} />}
            {badgeConfig[badge].label}
          </div>
        )}

        {/* Texto */}
        <div className="flex-1 flex items-center justify-center text-center px-2">
          <h3 className="font-bold text-base text-foreground leading-snug">{title}</h3>
        </div>

        {/* Emojis */}
        <div className="flex justify-center gap-4 text-3xl">👍 😔</div>

        {/* CTA */}
        <button
          className="
            mt-3 w-full py-2 rounded-lg
            bg-primary text-primary-foreground
            font-bold text-sm
            opacity-0 group-hover:opacity-100
            transition-opacity
          "
        >
          Jugar ahora
        </button>
      </div>
    </Link>
  );
};

export default GameCard;
