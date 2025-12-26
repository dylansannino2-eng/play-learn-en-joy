import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Gamepad2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Game {
  id: string;
  title: string;
  image: string;
  badge: string | null;
  category: string;
  description: string | null;
  meta_title: string | null; // NEW
  meta_description: string | null; // NEW
  is_active: boolean;
  sort_order: number;
}

type GameFormData = Omit<Game, "id">;

const categories = ["new", "popular", "multiplayer", "brain", "ranking"];
const badges = ["new", "hot", "top", "updated"];

const categoryLabels: Record<string, string> = {
  new: "Nuevos",
  popular: "Populares",
  multiplayer: "Multijugador",
  brain: "Cerebro",
  ranking: "Ranking",
};

const badgeLabels: Record<string, string> = {
  new: "Nuevo",
  hot: "Hot",
  top: "Top",
  updated: "Actualizado",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<GameFormData>({
    title: "",
    image: "",
    badge: null,
    category: "new",
    description: null,
    meta_title: null, // NEW
    meta_description: null, // NEW
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) {
        toast.error("No tienes permisos de administrador");
        navigate("/");
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchGames();
  }, [isAdmin]);

  const fetchGames = async () => {
    setIsLoadingGames(true);
    const { data, error } = await supabase.from("games").select("*").order("category").order("sort_order");

    if (error) toast.error("Error al cargar juegos");
    else setGames(data || []);

    setIsLoadingGames(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      image: "",
      badge: null,
      category: "new",
      description: null,
      meta_title: null, // NEW
      meta_description: null, // NEW
      is_active: true,
      sort_order: 0,
    });
    setEditingGame(null);
  };

  const handleOpenDialog = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        title: game.title,
        image: game.image,
        badge: game.badge,
        category: game.category,
        description: game.description,
        meta_title: game.meta_title, // NEW
        meta_description: game.meta_description, // NEW
        is_active: game.is_active,
        sort_order: game.sort_order,
      });
    } else resetForm();

    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.image) {
      toast.error("Título e imagen son requeridos");
      return;
    }

    const query = editingGame
      ? supabase.from("games").update(formData).eq("id", editingGame.id)
      : supabase.from("games").insert([formData]);

    const { error } = await query;

    if (error) toast.error(editingGame ? "Error al actualizar juego" : "Error al crear juego");
    else {
      toast.success(editingGame ? "Juego actualizado" : "Juego creado");
      setDialogOpen(false);
      fetchGames();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este juego?")) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error("Error al eliminar juego");
    else {
      toast.success("Juego eliminado");
      fetchGames();
    }
  };

  const toggleActive = async (game: Game) => {
    const { error } = await supabase.from("games").update({ is_active: !game.is_active }).eq("id", game.id);

    if (!error) fetchGames();
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Panel de Administración</h1>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Juego
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingGame ? "Editar Juego" : "Nuevo Juego"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* inputs existentes intactos */}

                <div className="space-y-2">
                  <Label>Meta Title (SEO)</Label>
                  <Input
                    value={formData.meta_title || ""}
                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meta Description (SEO)</Label>
                  <Input
                    value={formData.meta_description || ""}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value || null })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingGame ? "Guardar Cambios" : "Crear Juego"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* tabla intacta */}
      </div>
    </div>
  );
}
