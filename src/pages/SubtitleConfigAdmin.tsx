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
import { Plus, Pencil, Trash2, ArrowLeft, Film, Eye, Check, Sparkles, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// --- Interfaces ---
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

// --- Componente de Auto-Selección ---
interface AutoSelectorProps {
  subtitles: SubtitleItem[];
  difficulty: string;
  onAutoSelect: (data: { si: number; wi: number; word: string; start: number; end: number }) => void;
}

function AutoWordSelector({ subtitles, difficulty, onAutoSelect }: AutoSelectorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleProcess = () => {
    if (!subtitles.length) return;
    setIsGenerating(true);

    setTimeout(() => {
      let candidates: any[] = [];
      subtitles.forEach((sub, si) => {
        const words = sub.text.split(/\s+/);
        words.forEach((word, wi) => {
          const clean = word.replace(/[.,!?'"()]/g, "");
          if (clean.length < 3) return;

          const isLong = clean.length > 7;
          const isMedium = clean.length >= 4 && clean.length <= 7;

          if (difficulty === "easy" && !isLong)
            candidates.push({ si, wi, word: clean, start: sub.startTime, end: sub.endTime });
          else if (difficulty === "hard" && isLong)
            candidates.push({ si, wi, word: clean, start: sub.startTime, end: sub.endTime });
          else if (difficulty === "medium" && isMedium)
            candidates.push({ si, wi, word: clean, start: sub.startTime, end: sub.endTime });
        });
      });

      const selected = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;

      if (selected) {
        onAutoSelect({
          si: selected.si,
          wi: selected.wi,
          word: selected.word,
          start: Math.max(0, selected.start - 0.5),
          end: selected.end + 0.5,
        });
        toast.success("Configuración generada con éxito");
      } else {
        toast.error("No se encontraron palabras para esta dificultad");
      }
      setIsGenerating(false);
    }, 800);
  };

  return (
    <Button
      type="button"
      onClick={handleProcess}
      disabled={isGenerating}
      className="w-full bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary/90 text-white shadow-lg gap-2"
    >
      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {isGenerating ? "Analizando..." : "Auto-Configurar Clip e Inteligencia"}
    </Button>
  );
}

// --- Componente Principal ---
const difficulties = ["easy", "medium", "hard"];
const categories = ["comedy", "drama", "action", "documentary", "animation", "other"];
const difficultyLabels: Record<string, string> = { easy: "Fácil", medium: "Medio", hard: "Difícil" };
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
    if (!isLoading && (!user || !isAdmin)) navigate(user ? "/" : "/auth");
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
    if (!error) setConfigs(data as any);
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
    setSelectedWord(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    const { error } = await supabase
      .from("subtitle_configs")
      .update({
        ...formData,
        target_subtitle_index: selectedSubtitleIndex,
        hidden_word: manualWord || selectedWord || null,
        hidden_word_index: selectedWordIndex,
      })
      .eq("id", editingConfig.id);

    if (error) toast.error("Error al actualizar");
    else {
      toast.success("Guardado");
      setDialogOpen(false);
      fetchConfigs();
    }
  };

  const renderSubtitleWithSelection = (subtitle: SubtitleItem, subtitleIndex: number) => {
    const words = subtitle.text.split(/\s+/);
    return (
      <div key={subtitleIndex} className="p-3 bg-muted/30 rounded-lg mb-2 border border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {subtitle.startTime.toFixed(1)}s - {subtitle.endTime.toFixed(1)}s
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
                  "px-2 py-0.5 rounded text-sm transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold scale-105 shadow-sm"
                    : "bg-background hover:bg-muted border border-transparent hover:border-primary/30",
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
                <Film className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Movie Interpreter</h1>
                <p className="text-sm text-muted-foreground">Panel de Administración de Clips</p>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" /> {editingConfig?.name || "Configuración"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUMNA IZQUIERDA: CONFIG BÁSICA */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="space-y-4 p-4 border rounded-xl bg-muted/10">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-primary">Ajustes del Clip</h3>
                    <div className="space-y-2">
                      <Label>Nombre del Clip</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Inicio (s)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fin (s)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Dificultad Base</Label>
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
                  </div>

                  {/* SECCIÓN AUTO-SELECTOR (NUEVA) */}
                  <div className="p-4 border-2 border-primary/20 rounded-xl bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Sparkles className="w-4 h-4" /> ASISTENTE MÁGICO
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Analiza los subtítulos y configura automáticamente los tiempos y la palabra oculta según la
                      dificultad.
                    </p>
                    <AutoWordSelector
                      subtitles={editingConfig?.subtitles || []}
                      difficulty={formData.difficulty}
                      onAutoSelect={(data) => {
                        setSelectedSubtitleIndex(data.si);
                        setSelectedWordIndex(data.wi);
                        setSelectedWord(data.word);
                        setManualWord(data.word);
                        setFormData((prev) => ({
                          ...prev,
                          start_time: Number(data.start.toFixed(2)),
                          end_time: Number(data.end.toFixed(2)),
                        }));
                      }}
                    />
                  </div>
                </div>

                {/* COLUMNA DERECHA: SELECCIÓN MANUAL */}
                <div className="lg:col-span-8 space-y-4">
                  <Card className="border-none shadow-none bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest">
                        Selección Manual de Palabra
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Palabra Activa</Label>
                          <Input
                            value={manualWord}
                            onChange={(e) => handleManualWordChange(e.target.value)}
                            placeholder="Selecciona abajo o escribe..."
                          />
                        </div>
                        {selectedWord && (
                          <Badge className="h-10 px-4 bg-green-600">
                            <Check className="mr-2 w-4 h-4" /> Lista
                          </Badge>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-1 border rounded-lg p-2 bg-background">
                        {editingConfig?.subtitles?.map((sub, idx) => renderSubtitleWithSelection(sub, idx))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="px-8">
                  Guardar Todo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- TABLA DE CONFIGURACIONES (Sin cambios significativos) --- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Clips Disponibles</CardTitle>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" /> Importar desde Video
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Palabra</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Estado</TableHead>
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
                    <TableCell>
                      <Badge>{difficultyLabels[config.difficulty || ""]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active ?? false}
                        onCheckedChange={async () => {
                          await supabase
                            .from("subtitle_configs")
                            .update({ is_active: !config.is_active })
                            .eq("id", config.id);
                          fetchConfigs();
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPreviewConfig(config);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
