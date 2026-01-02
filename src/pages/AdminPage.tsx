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
import { Plus, Pencil, Trash2, ArrowLeft, Gamepad2, Film, BookOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  badge: string | null;
  category: string;
  categories: string[];
  description: string | null;
  is_active: boolean;
  sort_order: number;
  microlessons_enabled: boolean;
  multiplayer_enabled: boolean;
  base_game_slug: string | null;
  content_category: string | null;
}

type GameFormData = Omit<Game, "id">;

const skillCategories = ["listening", "speaking", "writing", "reading"];
const otherCategories = ["new", "popular", "multiplayer", "brain", "ranking"];
const badges = ["new", "hot", "top", "updated"];

// Base game slugs - these are the actual game components that can be rendered
const baseGameSlugs = [
  { value: "word-battle", label: "Word Battle" },
  { value: "the-translator", label: "The Translator" },
  { value: "the-movie-interpreter", label: "The Movie Interpreter" },
  { value: "word-search", label: "Word Search" },
  { value: "memorama", label: "Memorama" },
];

const categoryLabels: Record<string, string> = {
  listening: "🎧 Listening",
  speaking: "🗣️ Speaking",
  writing: "✍️ Writing",
  reading: "📖 Reading",
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
    slug: null,
    badge: null,
    category: "listening",
    categories: [],
    description: null,
    is_active: true,
    sort_order: 0,
    microlessons_enabled: true,
    multiplayer_enabled: true,
    base_game_slug: null,
    content_category: null,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        toast.error("No tienes permisos de administrador");
        navigate("/");
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchGames();
    }
  }, [isAdmin]);

  const fetchGames = async () => {
    setIsLoadingGames(true);
    const { data, error } = await supabase.from("games").select("*").order("category").order("sort_order");

    if (error) {
      toast.error("Error al cargar juegos");
    } else {
      setGames(data || []);
    }
    setIsLoadingGames(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      image: "",
      slug: null,
      badge: null,
      category: "listening",
      categories: [],
      description: null,
      is_active: true,
      sort_order: 0,
      microlessons_enabled: true,
      multiplayer_enabled: true,
      base_game_slug: null,
      content_category: null,
    });
    setEditingGame(null);
  };

  const handleOpenDialog = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        title: game.title,
        image: game.image,
        slug: game.slug,
        badge: game.badge,
        category: game.category,
        categories: game.categories || [],
        description: game.description,
        is_active: game.is_active,
        sort_order: game.sort_order,
        microlessons_enabled: game.microlessons_enabled ?? true,
        multiplayer_enabled: game.multiplayer_enabled ?? true,
        base_game_slug: game.base_game_slug,
        content_category: game.content_category,
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

    if (editingGame) {
      const { error } = await supabase.from("games").update(formData).eq("id", editingGame.id);

      if (error) {
        toast.error("Error al actualizar juego");
      } else {
        toast.success("Juego actualizado");
        setDialogOpen(false);
        fetchGames();
      }
    } else {
      const { error } = await supabase.from("games").insert([formData]);

      if (error) {
        toast.error("Error al crear juego");
      } else {
        toast.success("Juego creado");
        setDialogOpen(false);
        fetchGames();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este juego?")) return;

    const { error } = await supabase.from("games").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar juego");
    } else {
      toast.success("Juego eliminado");
      fetchGames();
    }
  };

  const toggleActive = async (game: Game) => {
    const { error } = await supabase.from("games").update({ is_active: !game.is_active }).eq("id", game.id);

    if (error) {
      toast.error("Error al actualizar estado");
    } else {
      fetchGames();
    }
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
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/subtitle-configs">
                <Film className="h-4 w-4 mr-2" />
                Movie Interpreter
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/microlessons">
                <BookOpen className="h-4 w-4 mr-2" />
                Microlecciones
              </Link>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Juego
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGame ? "Editar Juego" : "Nuevo Juego"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Datos Principales --- */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                {/* Slug field */}
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value || null })}
                    placeholder="the-movie-interpreter-phrasal-verbs"
                    required
                  />
                  <p className="text-xs text-muted-foreground">URL del juego: /game/{formData.slug || "tu-slug"}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">URL de Imagen *</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>

                {/* Base Game Slug - for variants */}
                <div className="space-y-2">
                  <Label>Juego Base (para variantes)</Label>
                  <Select
                    value={formData.base_game_slug || "none"}
                    onValueChange={(value) => setFormData({ ...formData, base_game_slug: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona juego base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno (usar slug propio)</SelectItem>
                      {baseGameSlugs.map((game) => (
                        <SelectItem key={game.value} value={game.value}>
                          {game.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Si es una variante, selecciona el juego base. Dejarlo vacío si es un juego principal.
                  </p>
                </div>

                {/* Content Category - filter for variants */}
                <div className="space-y-2">
                  <Label htmlFor="content_category">Categoría de Contenido (filtro)</Label>
                  <Input
                    id="content_category"
                    value={formData.content_category || ""}
                    onChange={(e) => setFormData({ ...formData, content_category: e.target.value || null })}
                    placeholder="phrasal-verbs, idioms, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Filtra el contenido del juego por esta categoría (ej: phrasal-verbs, idioms).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Habilidad (Skill)</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categorías adicionales</Label>
                  <div className="flex flex-wrap gap-2">
                    {[...skillCategories, ...otherCategories].map((cat) => {
                      const isSelected = formData.categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              categories: isSelected
                                ? prev.categories.filter(c => c !== cat)
                                : [...prev.categories, cat]
                            }));
                          }}
                          className={`px-3 py-1 rounded-full text-sm border transition ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted border-border hover:bg-muted/80"
                          }`}
                        >
                          {categoryLabels[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Badge</Label>
                  <Select
                    value={formData.badge || "none"}
                    onValueChange={(value) => setFormData({ ...formData, badge: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin badge</SelectItem>
                      {badges.map((badge) => (
                        <SelectItem key={badge} value={badge}>
                          {badgeLabels[badge]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (Interna/Visible en tarjeta)</Label>
                  <Input
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Orden</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Activo</Label>
                    <div className="pt-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Microlecciones</Label>
                    <div className="pt-2">
                      <Switch
                        checked={formData.microlessons_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, microlessons_enabled: checked })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Multijugador</Label>
                    <div className="pt-2">
                      <Switch
                        checked={formData.multiplayer_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, multiplayer_enabled: checked })}
                      />
                    </div>
                  </div>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Juegos ({games.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingGames ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay juegos. ¡Agrega el primero!</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead>Orden</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Microlec.</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          <img src={game.image} alt={game.title} className="w-16 h-12 object-cover rounded" />
                        </TableCell>
                        <TableCell className="font-medium">
                          {game.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary">{categoryLabels[game.category] || game.category}</Badge>
                            {game.categories?.filter(c => c !== game.category).map(cat => (
                              <Badge key={cat} variant="outline">{categoryLabels[cat] || cat}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {game.badge && <Badge variant="outline">{badgeLabels[game.badge]}</Badge>}
                        </TableCell>
                        <TableCell>{game.sort_order}</TableCell>
                        <TableCell>
                          <Switch checked={game.is_active} onCheckedChange={() => toggleActive(game)} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={game.microlessons_enabled ? "default" : "secondary"}>
                            {game.microlessons_enabled ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(game)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(game.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
