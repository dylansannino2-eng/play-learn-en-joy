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
  meta_title: string | null;
  meta_description: string | null;
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
    meta_title: null,
    meta_description: null,
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
      meta_title: null,
      meta_description: null,
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
        meta_title: game.meta_title,
        meta_description: game.meta_description,
        is_active: game.is_active,
        sort_order: game.sort_order,
      });
    } else {
      resetForm();
    }
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

    if (error) toast.error("Error al guardar juego");
    else {
      toast.success(editingGame ? "Juego actualizado" : "Juego creado");
      setDialogOpen(false);
      fetchGames();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar juego?")) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error("Error al eliminar");
    else fetchGames();
  };

  const toggleActive = async (game: Game) => {
    await supabase.from("games").update({ is_active: !game.is_active }).eq("id", game.id);
    fetchGames();
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Gamepad2 className="text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Panel de Administración</h1>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Juego
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingGame ? "Editar Juego" : "Nuevo Juego"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Título"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <Input
                  placeholder="URL Imagen"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
                <Input
                  placeholder="Descripción"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Input
                  placeholder="Meta Title (SEO)"
                  value={formData.meta_title || ""}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                />
                <Input
                  placeholder="Meta Description (SEO)"
                  value={formData.meta_description || ""}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABLA */}
        <Card>
          <CardHeader>
            <CardTitle>Juegos ({games.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.title}</TableCell>
                    <TableCell>
                      <Badge>{categoryLabels[game.category]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={game.is_active} onCheckedChange={() => toggleActive(game)} />
                    </TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(game)}>
                        <Pencil size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(game.id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
