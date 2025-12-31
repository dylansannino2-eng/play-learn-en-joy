import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Gamepad2,
  Users,
  Trophy,
  Flame,
  Sparkles,
  BookOpen,
  GraduationCap,
  Brain,
  MessageCircle,
  Settings,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expanded?: boolean;
  to?: string;
}

const SidebarItem = ({ icon, label, active, expanded, to }: SidebarItemProps) => {
  const content = (
    <>
      <span className="flex-shrink-0">{icon}</span>
      <span
        className={cn(
          "text-sm font-semibold whitespace-nowrap transition-all duration-200 overflow-hidden",
          expanded ? "opacity-100 w-auto" : "opacity-0 w-0",
        )}
      >
        {label}
      </span>
    </>
  );

  const className = cn(
    "h-12 flex items-center rounded-xl transition-all duration-200 gap-3",
    expanded ? "w-full px-3" : "w-12 justify-center",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  );

  if (to) {
    return (
      <Link to={to} className={className} title={!expanded ? label : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} title={!expanded ? label : undefined}>
      {content}
    </button>
  );
};

const Sidebar = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar flex flex-col py-4 gap-2 z-40 border-r border-sidebar-border transition-all duration-300 ease-in-out",
        expanded ? "w-52 px-3" : "w-16 items-center",
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className={cn("mb-4", expanded && "px-1")}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-foreground" />
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <SidebarItem icon={<Home size={22} />} label="Inicio" active expanded={expanded} to="/" />
        <SidebarItem icon={<Sparkles size={22} />} label="Nuevos" expanded={expanded} />
        <SidebarItem icon={<Flame size={22} />} label="Populares" expanded={expanded} />
        <SidebarItem icon={<Trophy size={22} />} label="Ranking" expanded={expanded} />

        <div className={cn("h-px bg-sidebar-border my-2", expanded ? "w-full" : "w-8")} />

        <SidebarItem icon={<GraduationCap size={22} />} label="Vocabulario" expanded={expanded} />
        <SidebarItem icon={<MessageCircle size={22} />} label="Gramática" expanded={expanded} />
        <SidebarItem icon={<Brain size={22} />} label="Pronunciación" expanded={expanded} />
        <SidebarItem icon={<Users size={22} />} label="Multijugador" expanded={expanded} />
        <SidebarItem icon={<Gamepad2 size={22} />} label="Single Player" expanded={expanded} />

        <div className={cn("h-px bg-sidebar-border my-2", expanded ? "w-full" : "w-8")} />

        <SidebarItem icon={<Wand2 size={22} />} label="Crear Contenido" expanded={expanded} to="/ai-creator" />
      </nav>

      <SidebarItem icon={<Settings size={22} />} label="Configuración" expanded={expanded} />
    </aside>
  );
};

export default Sidebar;
