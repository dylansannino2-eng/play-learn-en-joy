import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Film, Eye, Check, clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SubtitleItem {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleConfig {
  id: string;
  name: string | null;
  video_id: string | null;
  start_time: number | null;
  end_time: number | null;
  subtitles: SubtitleItem[] | null;
  translations: SubtitleItem[] | null;
  target_subtitle_index: number | null;
  hidden_word: string | null;
  hidden_word_index: number | null;
  difficulty: string | null;
  is_active: boolean | null;
  category: string | null;
}

const difficulties = ["easy", "medium", "hard"];
const categories = ["comedy", "drama", "action", "documentary", "animation", "other"];

const difficultyLabels: Record<string, string> = {
  easy: "Fácil",
  medium: "Medio",
  hard: "Difícil",
};

const categoryLabels: Record<string, string> = {
  comedy: "Comedia",
  drama: "Drama",
  action: "Acción",
  documentary: "Documental",
  animation: "Animación",
  other: "Otro",
};

export default function SubtitleConfigAdmin() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();

  const [configs, setConfigs] = useState<SubtitleConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SubtitleConfig | null>(null);
  const [previewConfig, setPreviewConfig] = useState<SubtitleConfig | null>(null);

  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [manualWord, setManualWord] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    video_id: "",
    start_time: 0,
    end_time: 30,
    difficulty: "medium",
    category: "comedy",
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
      fetchConfigs();
    }
  }, [isAdmin]);

  const fetchConfigs = async () => {
    setIsLoadingConfigs(true);
    const { data, error } = await supabase
      .from("subtitle_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar configuraciones");
    } else {
      const parsedConfigs = (data || []).map((item) => ({
        ...item,
        subtitles: Array.isArray(item.subtitles) ? (item.subtitles as unknown as SubtitleItem[]) : null,
        translations: Array.isArray(item.translations) ? (item.translations as unknown as SubtitleItem[]) : null,
      }));
      setConfigs(parsedConfigs);
    }
    setIsLoadingConfigs(false);
  };

  const handleOpenDialog = (config?: SubtitleConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name || "",
        video_id: config.video_id || "",
        start_time: config.start_time || 0,
        end_time: config.end_time || 30,
        difficulty: config.difficulty || "medium",
        category: config.category || "comedy",
        is_active: config.is_active ?? true,
      });
      setSelectedSubtitleIndex(config.target_subtitle_index);
      setSelectedWordIndex(config.hidden_word_index);
      setSelectedWord(config.hidden_word || "");
      setManualWord(config.hidden_word || "");
    } else {
      setEditingConfig(null);
      setFormData({
        name: "",
        video_id: "",
        start_time: 0,
        end_time: 30,
        difficulty: "medium",
        category: "comedy",
        is_active: true,
      });
      setSelectedSubtitleIndex(null);
      setSelectedWordIndex(null);
      setSelectedWord("");
      setManualWord("");
    }
    setDialogOpen(true);
  };

  const handleWordClick = (subtitleIndex: number, wordIndex: number, word: string) => {
    const cleanWord = word.replace(/[.,!?'"()]/g, "");
    setSelectedSubtitleIndex(subtitleIndex);
    setSelectedWordIndex(wordIndex);
    setSelectedWord(cleanWord);
    setManualWord(cleanWord);
  };

  const handleManualWordChange = (value: string) => {
    setManualWord(value);
    if (editingConfig?.subtitles) {
      for (let si = 0; si < editingConfig.subtitles.length; si++) {
        const words = editingConfig.subtitles[si].text.split(/\s+/);
        for (let wi = 0; wi < words.length; wi++) {
          const cleanWord = words[wi].replace(/[.,!?'"()]/g, "").toLowerCase();
          if (cleanWord === value.toLowerCase()) {
            setSelectedSubtitleIndex(si);
            setSelectedWordIndex(wi);
            setSelectedWord(cleanWord);
            return;
          }
        }
      }
    }
    setSelectedWord(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    const updateData = {
      ...formData,
      target_subtitle_index: selectedSubtitleIndex,
      hidden_word: manualWord || selectedWord || null,
      hidden_word_index: selectedWordIndex,
    };

    const { error } = await supabase.from("subtitle_configs").update(updateData).eq("id", editingConfig.id);

    if (error) {
      toast.error("Error al actualizar configuración");
    } else {
      toast.success("Configuración actualizada");
      setDialogOpen(false);
      fetchConfigs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta configuración?")) return;
    const { error } = await supabase.from("subtitle_configs").delete().eq("id", id);
    if (error) toast.error("Error al eliminar");
    else fetchConfigs();
  };

  const toggleActive = async (config: SubtitleConfig) => {
    const { error } = await supabase
      .from("subtitle_configs")
      .update({ is_active: !config.is_active })
      .eq("id", config.id);
    if (!error) fetchConfigs();
  };

  const renderSubtitleWithSelection = (subtitle: SubtitleItem, subtitleIndex: number) => {
    const words = subtitle.text.split(/\s+/);
    const isInRange = subtitle.startTime >= formData.start_time && subtitle.endTime <= formData.end_time;

    return (
      <div
        key={subtitle.id}
        className={cn(
          "p-3 rounded-lg mb-2 border transition-all group relative",
          isInRange ? "bg-primary/5 border-primary/30" : "bg-muted/50 border-transparent",
        )}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="text-[10px] font-mono text-muted-foreground">
            {subtitle.startTime.toFixed(1)}s - {subtitle.endTime.toFixed(1)}s
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              size="sm"
              variant={formData.start_time === subtitle.startTime ? "default" : "outline"}
              className="h-6 px-2 text-[10px]"
              onClick={() => setFormData((prev) => ({ ...prev, start_time: subtitle.startTime }))}
            >
              Set Inicio
            </Button>
            <Button
              type="button"
              size="sm"
              variant={formData.end_time === subtitle.endTime ? "default" : "outline"}
              className="h-6 px-2 text-[10px]"
              onClick={() => setFormData((prev) => ({ ...prev, end_time: subtitle.endTime }))}
            >
              Set Fin
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {words.map((word, wordIndex) => {
            const isSelected = selectedSubtitleIndex === subtitleIndex && selectedWordIndex === wordIndex;
            return (
              <button
                key={wordIndex}
                type="button"
                onClick={() => handleWordClick(subtitleIndex, wordIndex, word)}
                className={cn(
                  "px-2 py-1 rounded text-sm transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-background hover:bg-primary/10 border border-transparent hover:border-primary/20",
                )}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading || !isAdmin)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Movie Interpreter</h1>
              <p className="text-sm text-muted-foreground">Configurar clips y palabras ocultas</p>
            </div>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingConfig ? `Editar: ${editingConfig.name}` : "Nueva Configuración"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Video ID</Label>
                  <Input
                    value={formData.video_id}
                    onChange={(e) => setFormData({ ...formData, video_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Dificultad</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((d) => (
                        <SelectItem key={d} value={d}>
                          {difficultyLabels[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-primary flex items-center gap-1">Inicio (seg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-primary flex items-center gap-1">Fin (seg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {editingConfig?.subtitles && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Editor de Clip y Palabra</CardTitle>
                    <CardDescription>
                      Usa "Set Inicio/Fin" para definir el tiempo del video basado en los subtítulos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Palabra a ocultar</Label>
                        <Input
                          value={manualWord}
                          onChange={(e) => handleManualWordChange(e.target.value)}
                          placeholder="Selecciona una palabra abajo..."
                        />
                      </div>
                      {selectedWord && (
                        <Badge className="h-10 px-4 text-base">
                          <Check className="w-4 h-4 mr-2" />
                          {selectedWord}
                        </Badge>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-1 border rounded-lg p-3 bg-black/5">
                      {editingConfig.subtitles.map((sub, idx) => renderSubtitleWithSelection(sub, idx))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                  />
                  <Label>Activo</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Cambios</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tabla de configuraciones (Mismo código original simplificado) */}
        <Card>
          <CardHeader>
            <CardTitle>Configuraciones ({configs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Palabra</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.hidden_word}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {config.start_time}s - {config.end_time}s
                    </TableCell>
                    <TableCell>
                      <Switch checked={config.is_active ?? true} onCheckedChange={() => toggleActive(config)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(config)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
