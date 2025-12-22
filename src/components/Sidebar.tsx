import { Home, Gamepad2, Users, Trophy, Flame, Sparkles, BookOpen, GraduationCap, Brain, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const SidebarItem = ({ icon, label, active }: SidebarItemProps) => (
  <button
    className={cn(
      "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group relative",
      active 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
    )}
    title={label}
  >
    {icon}
    <span className="absolute left-14 bg-card px-3 py-1.5 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
      {label}
    </span>
  </button>
);

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-sidebar flex flex-col items-center py-4 gap-2 z-40 border-r border-sidebar-border">
      <div className="mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-foreground" />
        </div>
      </div>
      
      <nav className="flex flex-col gap-1 flex-1">
        <SidebarItem icon={<Home size={22} />} label="Inicio" active />
        <SidebarItem icon={<Sparkles size={22} />} label="Nuevos" />
        <SidebarItem icon={<Flame size={22} />} label="Populares" />
        <SidebarItem icon={<Trophy size={22} />} label="Ranking" />
        
        <div className="w-8 h-px bg-sidebar-border my-2" />
        
        <SidebarItem icon={<GraduationCap size={22} />} label="Vocabulario" />
        <SidebarItem icon={<MessageCircle size={22} />} label="Gramática" />
        <SidebarItem icon={<Brain size={22} />} label="Pronunciación" />
        <SidebarItem icon={<Users size={22} />} label="Multijugador" />
        <SidebarItem icon={<Gamepad2 size={22} />} label="Arcade" />
      </nav>
      
      <SidebarItem icon={<Settings size={22} />} label="Configuración" />
    </aside>
  );
};

export default Sidebar;
