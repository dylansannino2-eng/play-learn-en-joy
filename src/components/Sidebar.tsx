import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, BookOpen, GraduationCap, MessageCircle, Settings, Wand2, Mic, User, PenTool } from "lucide-react";
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
  const location = useLocation();

  // Función auxiliar para determinar si la ruta actual coincide con el ítem
  const isActive = (path: string) => location.pathname === path;

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
        <SidebarItem icon={<Home size={22} />} label="Inicio" active={isActive("/")} expanded={expanded} to="/" />

        <div className={cn("h-px bg-sidebar-border my-2", expanded ? "w-full" : "w-8")} />

        <SidebarItem
          icon={<GraduationCap size={22} />}
          label="Vocabulario"
          expanded={expanded}
          to="/vocabulary"
          active={isActive("/vocabulary")}
        />
        <SidebarItem
          icon={<PenTool size={22} />}
          label="Gramática"
          expanded={expanded}
          to="/grammar"
          active={isActive("/grammar")}
        />
        <SidebarItem
          icon={<Mic size={22} />}
          label="Pronunciación"
          expanded={expanded}
          to="/pronunciation"
          active={isActive("/pronunciation")}
        />

        <div className={cn("h-px bg-sidebar-border my-2", expanded ? "w-full" : "w-8")} />

        <SidebarItem
          icon={<Users size={22} />}
          label="Multijugador"
          expanded={expanded}
          to="/multiplayer"
          active={isActive("/multiplayer")}
        />
        <SidebarItem
          icon={<User size={22} />}
          label="Single Player"
          expanded={expanded}
          to="/single-player"
          active={isActive("/single-player")}
        />

        <div className={cn("h-px bg-sidebar-border my-2", expanded ? "w-full" : "w-8")} />

        <SidebarItem
          icon={<Wand2 size={22} />}
          label="Crear Contenido"
          expanded={expanded}
          to="/ai-creator"
          active={isActive("/ai-creator")}
        />
      </nav>

      {/* ⚙️ Link a Configuración actualizado */}
      <SidebarItem
        icon={<Settings size={22} />}
        label="Configuración"
        expanded={expanded}
        to="/settings"
        active={isActive("/settings")}
      />
    </aside>
  );
};

export default Sidebar;
