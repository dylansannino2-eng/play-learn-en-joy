import { useState, useEffect, useRef } from "react";
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
import { Plus, Pencil, Trash2, ArrowLeft, Film, Eye, Play, Check } from "lucide-react";
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
  
  // Word selection state
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [manualWord, setManualWord] = useState("");

  // Form state
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
      // Parse the data properly
      const parsedConfigs = (data || []).map(item => ({
        ...item,
        subtitles: Array.isArray(item.subtitles) ? item.subtitles as unknown as SubtitleItem[] : null,
        translations: Array.isArray(item.translations) ? item.translations as unknown as SubtitleItem[] : null,
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
    const cleanWord = word.replace(/[.,!?'"()]/g, '');
    setSelectedSubtitleIndex(subtitleIndex);
    setSelectedWordIndex(wordIndex);
    setSelectedWord(cleanWord);
    setManualWord(cleanWord);
  };

  const handleManualWordChange = (value: string) => {
    setManualWord(value);
    // Try to find this word in subtitles
    if (editingConfig?.subtitles) {
      for (let si = 0; si < editingConfig.subtitles.length; si++) {
        const words = editingConfig.subtitles[si].text.split(/\s+/);
        for (let wi = 0; wi < words.length; wi++) {
          const cleanWord = words[wi].replace(/[.,!?'"()]/g, '').toLowerCase();
          if (cleanWord === value.toLowerCase()) {
            setSelectedSubtitleIndex(si);
            setSelectedWordIndex(wi);
            setSelectedWord(cleanWord);
            return;
          }
        }
      }
    }
    // If not found, just use the manual word
    setSelectedWord(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingConfig) {
      toast.error("Debes seleccionar una configuración existente para editar");
      return;
    }

    const updateData = {
      name: formData.name,
      video_id: formData.video_id,
      start_time: formData.start_time,
      end_time: formData.end_time,
      difficulty: formData.difficulty,
      category: formData.category,
      is_active: formData.is_active,
      target_subtitle_index: selectedSubtitleIndex,
      hidden_word: manualWord || selectedWord || null,
      hidden_word_index: selectedWordIndex,
    };

    const { error } = await supabase
      .from("subtitle_configs")
      .update(updateData)
      .eq("id", editingConfig.id);

    if (error) {
      toast.error("Error al actualizar configuración");
      console.error(error);
    } else {
      toast.success("Configuración actualizada");
      setDialogOpen(false);
      fetchConfigs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta configuración?")) return;

    const { error } = await supabase.from("subtitle_configs").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar configuración");
    } else {
      toast.success("Configuración eliminada");
      fetchConfigs();
    }
  };

  const toggleActive = async (config: SubtitleConfig) => {
    const { error } = await supabase
      .from("subtitle_configs")
      .update({ is_active: !config.is_active })
      .eq("id", config.id);

    if (error) {
      toast.error("Error al actualizar estado");
    } else {
      fetchConfigs();
    }
  };

  const openPreview = (config: SubtitleConfig) => {
    setPreviewConfig(config);
    setPreviewOpen(true);
  };

  const renderSubtitleWithSelection = (subtitle: SubtitleItem, subtitleIndex: number) => {
    const words = subtitle.text.split(/\s+/);
    
    return (
      <div key={subtitle.id} className="p-3 bg-muted/50 rounded-lg mb-2">
        <div className="text-xs text-muted-foreground mb-1">
          {subtitle.startTime.toFixed(1)}s - {subtitle.endTime.toFixed(1)}s
        </div>
        <div className="flex flex-wrap gap-1">
          {words.map((word, wordIndex) => {
            const isSelected = 
              selectedSubtitleIndex === subtitleIndex && 
              selectedWordIndex === wordIndex;
            const cleanWord = word.replace(/[.,!?'"()]/g, '');
            
            return (
              <button
                key={wordIndex}
                type="button"
                onClick={() => handleWordClick(subtitleIndex, wordIndex, word)}
                className={cn(
                  "px-2 py-1 rounded text-sm transition-all cursor-pointer hover:bg-primary/20",
                  isSelected 
                    ? "bg-primary text-primary-foreground font-bold" 
                    : "bg-background hover:ring-2 ring-primary/50",
                  cleanWord.length < 3 && "opacity-50"
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Film className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Movie Interpreter</h1>
                <p className="text-sm text-muted-foreground">Configurar clips y palabras ocultas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? `Editar: ${editingConfig.name}` : "Nueva Configuración"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_id">Video ID (YouTube)</Label>
                  <Input
                    id="video_id"
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
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
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
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
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
                  <Label>Inicio (seg)</Label>
                  <Input
                    type="number"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin (seg)</Label>
                  <Input
                    type="number"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Word Selection Section */}
              {editingConfig?.subtitles && editingConfig.subtitles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Seleccionar Palabra Oculta</CardTitle>
                    <CardDescription>
                      Haz clic en la palabra que quieres ocultar, o escríbela manualmente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Manual input */}
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Palabra a ocultar</Label>
                        <Input
                          value={manualWord}
                          onChange={(e) => handleManualWordChange(e.target.value)}
                          placeholder="Escribe la palabra o haz clic abajo..."
                        />
                      </div>
                      {selectedWord && (
                        <Badge variant="default" className="h-10 px-4 text-base">
                          <Check className="w-4 h-4 mr-2" />
                          {selectedWord}
                        </Badge>
                      )}
                    </div>

                    {/* Subtitles with clickable words */}
                    <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {editingConfig.subtitles.map((sub, idx) => 
                        renderSubtitleWithSelection(sub, idx)
                      )}
                    </div>

                    {selectedSubtitleIndex !== null && selectedWordIndex !== null && (
                      <div className="text-sm text-muted-foreground">
                        Seleccionado: Subtítulo #{selectedSubtitleIndex + 1}, Palabra #{selectedWordIndex + 1}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-4">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Activo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar Cambios</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vista Previa: {previewConfig?.name}</DialogTitle>
            </DialogHeader>
            {previewConfig && (
              <div className="space-y-4">
                {previewConfig.video_id && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${previewConfig.video_id}?start=${Math.floor(previewConfig.start_time || 0)}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                
                {previewConfig.hidden_word && (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Palabra a adivinar:</p>
                    <p className="text-2xl font-bold text-primary">{previewConfig.hidden_word}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Subtítulos:</p>
                  {previewConfig.subtitles?.map((sub, idx) => (
                    <div 
                      key={sub.id} 
                      className={cn(
                        "p-2 rounded text-sm",
                        idx === previewConfig.target_subtitle_index 
                          ? "bg-primary/20 border border-primary" 
                          : "bg-muted/50"
                      )}
                    >
                      {idx === previewConfig.target_subtitle_index && previewConfig.hidden_word ? (
                        <span>
                          {sub.text.split(/\s+/).map((word, wi) => (
                            <span key={wi}>
                              {wi === previewConfig.hidden_word_index ? (
                                <span className="bg-primary text-primary-foreground px-1 rounded">____</span>
                              ) : (
                                word
                              )}
                              {wi < sub.text.split(/\s+/).length - 1 ? " " : ""}
                            </span>
                          ))}
                        </span>
                      ) : (
                        sub.text
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Configs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Configuraciones ({configs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingConfigs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay configuraciones. Usa el AI Creator para generar clips.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Palabra Oculta</TableHead>
                      <TableHead>Dificultad</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.name || "Sin nombre"}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {config.video_id || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          {config.hidden_word ? (
                            <Badge variant="default">{config.hidden_word}</Badge>
                          ) : (
                            <Badge variant="destructive" className="opacity-70">
                              Sin configurar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {difficultyLabels[config.difficulty || "medium"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {config.category && (
                            <Badge variant="outline">
                              {categoryLabels[config.category] || config.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={config.is_active ?? true} 
                            onCheckedChange={() => toggleActive(config)} 
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openPreview(config)}
                              title="Vista previa"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenDialog(config)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(config.id)}
                              title="Eliminar"
                            >
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
