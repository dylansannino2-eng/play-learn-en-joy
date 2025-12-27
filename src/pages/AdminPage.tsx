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
import { Plus, Pencil, Trash2, ArrowLeft, Gamepad2, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Game {
  id: string;
  title: string;
  image: string;
  badge: string | null;
  category: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

type GameFormData = Omit<Game, "id">;

// Categorías exactas (deben coincidir con la base de datos)
const categories = ["new", "popular", "multiplayer", "brain", "ranking", "listening", "speaking", "reading", "writing"];
const badges = ["new", "hot", "top", "updated"];

const categoryLabels: Record<string, string> = {
  new: "Nuevos",
  popular: "Populares",
  multiplayer: "Multijugador",
  brain: "Lógica",
  ranking: "Ranking",
  listening: "🎧 Listening",
  speaking: "🗣️ Speaking",
  reading: "📖 Reading",
  writing: "✍️ Writing",
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
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [formData, setFormData] = useState<GameFormData>({
    title: "",
    image: "",
    badge: null,
    category: "new",
    description: null,
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

  // Filtro de búsqueda en tiempo real
  useEffect(() => {
    const results = games.filter(
      (game) =>
        game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.category.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredGames(results);
  }, [searchTerm, games]);

  const fetchGames = async () => {
    setIsLoadingGames(true);
    const { data, error } = await supabase.from("games").select("*").order("category").order("sort_order");
    if (error) toast.error("Error al cargar juegos");
    else {
      setGames(data || []);
      setFilteredGames(data || []);
    }
    setIsLoadingGames(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      image: "",
      badge: null,
      category: "new",
      description: null,
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

    const { error } = editingGame
      ? await supabase.from("games").update(formData).eq("id", editingGame.id)
      : await supabase.from("games").insert([formData]);

    if (error) {
      console.error("Error Supabase:", error);
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(editingGame ? "Juego actualizado" : "Juego creado");
      setDialogOpen(false);
      fetchGames();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este juego?")) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error("Error al eliminar");
    else {
      toast.success("Eliminado correctamente");
      fetchGames();
    }
  };

  const toggleActive = async (game: Game) => {
    const { error } = await supabase.from("games").update({ is_active: !game.is_active }).eq("id", game.id);
    if (error) toast.error("Error al actualizar estado");
    else fetchGames();
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar juego..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingGame ? "Editar Juego" : "Nuevo Juego"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Imagen *</Label>
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {categoryLabels[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Badge</Label>
                      <Select
                        value={formData.badge || "none"}
                        onValueChange={(val) => setFormData({ ...formData, badge: val === "none" ? null : val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin badge</SelectItem>
                          {badges.map((b) => (
                            <SelectItem key={b} value={b}>
                              {badgeLabels[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagen</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <img src={game.image} className="w-12 h-10 object-cover rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{game.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryLabels[game.category] || game.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={game.is_active} onCheckedChange={() => toggleActive(game)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(game)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
