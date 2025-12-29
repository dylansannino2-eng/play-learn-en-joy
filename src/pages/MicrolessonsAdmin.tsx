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
import { Plus, Pencil, Trash2, ArrowLeft, BookOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Microlesson {
  id: string;
  word: string;
  meaning: string;
  examples: string[];
  category: string | null;
  difficulty: string | null;
  is_active: boolean;
  created_at: string;
}

interface MicrolessonFormData {
  word: string;
  meaning: string;
  examples: string[];
  category: string | null;
  difficulty: string | null;
  is_active: boolean;
}

const difficultyOptions = [
  { value: 'easy', label: 'Fácil', color: 'text-green-400' },
  { value: 'medium', label: 'Medio', color: 'text-yellow-400' },
  { value: 'hard', label: 'Difícil', color: 'text-red-400' },
];

const categoryOptions = [
  'contractions',
  'verbs',
  'nouns',
  'adjectives',
  'phrases',
  'idioms',
];

export default function MicrolessonsAdmin() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();

  const [microlessons, setMicrolessons] = useState<Microlesson[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Microlesson | null>(null);
  const [examplesText, setExamplesText] = useState('');

  const [formData, setFormData] = useState<MicrolessonFormData>({
    word: "",
    meaning: "",
    examples: [],
    category: null,
    difficulty: "medium",
    is_active: true,
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
      fetchMicrolessons();
    }
  }, [isAdmin]);

  const fetchMicrolessons = async () => {
    setIsLoadingData(true);
    const { data, error } = await supabase
      .from("microlessons")
      .select("*")
      .order("word");

    if (error) {
      toast.error("Error al cargar microlecciones");
    } else {
      setMicrolessons(data || []);
    }
    setIsLoadingData(false);
  };

  const resetForm = () => {
    setFormData({
      word: "",
      meaning: "",
      examples: [],
      category: null,
      difficulty: "medium",
      is_active: true,
    });
    setExamplesText('');
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: Microlesson) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        word: item.word,
        meaning: item.meaning,
        examples: item.examples || [],
        category: item.category,
        difficulty: item.difficulty,
        is_active: item.is_active,
      });
      setExamplesText((item.examples || []).join('\n'));
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.word || !formData.meaning) {
      toast.error("Palabra y significado son requeridos");
      return;
    }

    const examples = examplesText.split('\n').filter(line => line.trim().length > 0);
    const dataToSave = { ...formData, examples };

    if (editingItem) {
      const { error } = await supabase
        .from("microlessons")
        .update(dataToSave)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Error al actualizar microlección");
      } else {
        toast.success("Microlección actualizada");
        setDialogOpen(false);
        fetchMicrolessons();
      }
    } else {
      const { error } = await supabase.from("microlessons").insert([dataToSave]);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe una microlección para esta palabra");
        } else {
          toast.error("Error al crear microlección");
        }
      } else {
        toast.success("Microlección creada");
        setDialogOpen(false);
        fetchMicrolessons();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta microlección?")) return;

    const { error } = await supabase.from("microlessons").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar microlección");
    } else {
      toast.success("Microlección eliminada");
      fetchMicrolessons();
    }
  };

  const toggleActive = async (item: Microlesson) => {
    const { error } = await supabase
      .from("microlessons")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      toast.error("Error al actualizar estado");
    } else {
      fetchMicrolessons();
    }
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    const option = difficultyOptions.find(d => d.value === difficulty);
    if (!option) return null;
    return (
      <Badge variant="outline" className={option.color}>
        {option.label}
      </Badge>
    );
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Administrar Microlecciones</h1>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Microlección
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Editar Microlección" : "Nueva Microlección"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="word">Palabra *</Label>
                  <Input
                    id="word"
                    value={formData.word}
                    onChange={(e) => setFormData({ ...formData, word: e.target.value.toLowerCase() })}
                    placeholder="don't, can't, hello..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meaning">Significado *</Label>
                  <Textarea
                    id="meaning"
                    value={formData.meaning}
                    onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                    placeholder="Contracción de 'do not'. Se usa para negar acciones."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="examples">Ejemplos (uno por línea)</Label>
                  <Textarea
                    id="examples"
                    value={examplesText}
                    onChange={(e) => setExamplesText(e.target.value)}
                    placeholder="I don't like coffee. (No me gusta el café)&#10;Don't worry! (¡No te preocupes!)"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dificultad</Label>
                    <Select
                      value={formData.difficulty || "medium"}
                      onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={formData.category || "none"}
                      onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría</SelectItem>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Activo</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingItem ? "Guardar Cambios" : "Crear Microlección"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Microlecciones ({microlessons.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : microlessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay microlecciones. ¡Agrega la primera!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Palabra</TableHead>
                      <TableHead>Significado</TableHead>
                      <TableHead>Ejemplos</TableHead>
                      <TableHead>Dificultad</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {microlessons.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium font-mono">
                          {item.word}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.meaning}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.examples?.length || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {getDifficultyBadge(item.difficulty)}
                        </TableCell>
                        <TableCell>
                          {item.category && (
                            <Badge variant="outline">
                              {item.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
