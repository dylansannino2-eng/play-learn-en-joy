import { Search, Bell, Heart, User, LogOut, Settings, Languages, ChevronDown } from "lucide-react"; // 👈 Añadido Languages y ChevronDown
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react"; // 👈 Añadido useState
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("Inglés"); // 👈 Estado para el idioma

  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-16 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-border z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        >
          Game Your Language
        </Link>

        {/* 🌐 Selector de Idioma en lugar de BETA */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider outline-none">
              <Languages size={12} />
              {language}
              <ChevronDown size={10} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            <DropdownMenuItem onClick={() => setLanguage("Inglés")}>Inglés</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("Francés")}>Francés</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("Alemán")}>Alemán</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("Italiano")}>Italiano</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={`Buscar juegos para aprender ${language.toLowerCase()}...`} // 👈 Placeholder dinámico
            className="w-full pl-12 pr-4 h-11 bg-secondary border-none rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
        >
          <Bell size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl relative"
        >
          <Heart size={20} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-2 gap-2 rounded-xl px-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">{user.email?.split("@")[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Panel Admin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={() => navigate("/auth")}
            className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-5"
          >
            <User size={18} className="mr-2" />
            Iniciar sesión
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
