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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Film, Eye, Check, Sparkles } from "lucide-react";
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
  const [editingConfig, setEditingConfig] = useState<SubtitleConfig | null>(null);

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
    if (!isLoading && (!user || !isAdmin)) {
      navigate(user ? "/" : "/auth");
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchConfigs();
  }, [isAdmin]);

  const fetchConfigs = async () => {
    setIsLoadingConfigs(true);
    const { data, error } = await supabase
      .from("subtitle_configs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      const parsed = (data || []).map((item) => ({
        ...item,
        subtitles: Array.isArray(item.subtitles) ? (item.subtitles as unknown as SubtitleItem[]) : null,
        translations: Array.isArray(item.translations) ? (item.translations as unknown as SubtitleItem[]) : null,
      }));
      setConfigs(parsed as SubtitleConfig[]);
    }
    setIsLoadingConfigs(false);
  };

  /**
   * Lógica de Autoselección Inteligente
   */
  const autoSelectByDifficulty = (level: string) => {
    if (!editingConfig?.subtitles || editingConfig.subtitles.length === 0) return;

    const subs = editingConfig.subtitles;
    let candidates: { sIdx: number; wIdx: number; word: string }[] = [];

    // Definir criterios de longitud según dificultad
    const criteria = {
      easy: { min: 3, max: 5 },
      medium: { min: 5, max: 8 },
      hard: { min: 8, max: 20 },
    }[level as keyof typeof criteria];

    subs.forEach((sub, sIdx) => {
      const words = sub.text.split(/\s+/);
      words.forEach((word, wIdx) => {
        const clean = word.replace(/[.,!?'"()]/g, "");
        if (clean.length >= criteria.min && clean.length <= criteria.max) {
          candidates.push({ sIdx, wIdx, word: clean });
        }
      });
    });

    if (candidates.length > 0) {
      // Elegir uno al azar de los candidatos
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const targetSub = subs[picked.sIdx];

      // 1. Setear palabra
      setSelectedSubtitleIndex(picked.sIdx);
      setSelectedWordIndex(picked.wIdx);
      setSelectedWord(picked.word);
      setManualWord(picked.word);

      // 2. Ajustar tiempos automáticamente (ventana de aprox 10-15 segundos alrededor de la palabra)
      const buffer = 5;
      const newStart = Math.max(0, targetSub.startTime - buffer);
      const newEnd = targetSub.endTime + buffer;

      setFormData((prev) => ({
        ...prev,
        difficulty: level,
        start_time: Number(newStart.toFixed(2)),
        end_time: Number(newEnd.toFixed(2)),
      }));

      toast.success(`Autoselección: "${picked.word}" (Subtítulo #${picked.sIdx + 1})`);
    } else {
      toast.error("No se encontraron palabras para esa dificultad en este video.");
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    const { error } = await supabase
      .from("subtitle_configs")
      .update({
        ...formData,
        target_subtitle_index: selectedSubtitleIndex,
        hidden_word: manualWord || selectedWord,
        hidden_word_index: selectedWordIndex,
      })
      .eq("id", editingConfig.id);

    if (error) toast.error("Error al guardar");
    else {
      toast.success("Actualizado");
      setDialogOpen(false);
      fetchConfigs();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="text-primary" /> Movie Interpreter Admin
          </h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-xl">Configurar Clip</DialogTitle>
              <DialogDescription>Ajusta los tiempos y selecciona la palabra clave.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Clip</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-3 h-3" /> Dificultad (Autoselector)
                  </Label>
                  <Select value={formData.difficulty} onValueChange={(v) => autoSelectByDifficulty(v)}>
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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-dashed border-primary/20">
                <div className="space-y-2">
                  <Label>Inicio (seg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin (seg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: parseFloat(e.target.value) })}
                  />
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
                <div className="flex items-center gap-3 pt-8">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                  />
                  <Label>Activo</Label>
                </div>
              </div>

              {editingConfig?.subtitles && (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex-1 max-w-xs space-y-2">
                      <Label>Palabra seleccionada</Label>
                      <Input
                        value={manualWord}
                        onChange={(e) => setManualWord(e.target.value)}
                        className="font-bold text-primary"
                      />
                    </div>
                    {selectedWord && (
                      <Badge className="mb-1 h-9 px-4">
                        INDEX: Sub {selectedSubtitleIndex} | Word {selectedWordIndex}
                      </Badge>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded-xl p-4 bg-black/20">
                    {editingConfig.subtitles.map((sub, sIdx) => {
                      const isInRange = sub.startTime >= formData.start_time && sub.endTime <= formData.end_time;
                      return (
                        <div
                          key={sub.id}
                          className={cn(
                            "p-3 rounded-lg border transition-all relative group",
                            isInRange ? "bg-primary/10 border-primary/40" : "opacity-40 border-transparent",
                          )}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {sub.startTime.toFixed(2)}s → {sub.endTime.toFixed(2)}s
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-6 text-[10px]"
                                onClick={() => setFormData((p) => ({ ...p, start_time: sub.startTime }))}
                              >
                                Inicio
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-6 text-[10px]"
                                onClick={() => setFormData((p) => ({ ...p, end_time: sub.endTime }))}
                              >
                                Fin
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sub.text.split(/\s+/).map((word, wIdx) => (
                              <button
                                key={wIdx}
                                type="button"
                                onClick={() => handleWordClick(sIdx, wIdx, word)}
                                className={cn(
                                  "px-2 py-1 rounded text-sm transition-all",
                                  selectedSubtitleIndex === sIdx && selectedWordIndex === wIdx
                                    ? "bg-primary text-white scale-110 shadow-lg"
                                    : "bg-background hover:bg-primary/20",
                                )}
                              >
                                {word}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="px-8">
                  Actualizar Configuración
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tabla principal de gestión */}
        <Card className="border-primary/10 shadow-xl">
          <CardHeader>
            <CardTitle>Clips Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Palabra</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Rango de Tiempo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/5">
                        {config.hidden_word}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{difficultyLabels[config.difficulty || "medium"]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {config.start_time}s - {config.end_time}s
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(config)}>
                        <Pencil className="h-4 w-4" />
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
