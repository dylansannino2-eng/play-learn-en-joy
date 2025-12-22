import { Search, Bell, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Header = () => {
  return (
    <header className="fixed top-0 left-16 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-border z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          EnglishPlay
        </h1>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-badge-new/20 text-badge-new">
          BETA
        </span>
      </div>
      
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar juegos para aprender inglés..."
            className="w-full pl-12 pr-4 h-11 bg-secondary border-none rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl">
          <Bell size={20} />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl relative">
          <Heart size={20} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
        <Button className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-5">
          <User size={18} className="mr-2" />
          Iniciar sesión
        </Button>
      </div>
    </header>
  );
};

export default Header;
