import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfigPanel, RepeatConfig } from "@/components/ConfigPanel";
import { YouTubePlayer, YouTubePlayerRef } from "@/components/YouTubePlayer";
import { SubtitleDisplay } from "@/components/SubtitleDisplay";
import { SubtitleList } from "@/components/SubtitleList";
import { SavedConfigsList } from "@/components/SavedConfigsList";
import { parseSRT, getCurrentSubtitle, Subtitle } from "@/lib/srtParser";
import { useSubtitleConfig } from "@/hooks/useSubtitleConfig";
import { Save, Film, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VideoImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function VideoImportModal({ open, onOpenChange, onSuccess }: VideoImportModalProps) {
  // Estados locales
  const [videoId, setVideoId] = useState(""); // Aquí guardamos la entrada cruda del usuario
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [translations, setTranslations] = useState<Subtitle[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig | null>(null);
  const [configName, setConfigName] = useState("");

  const playerRef = useRef<YouTubePlayerRef>(null);
  const { configs, isLoading, saveConfig, loadConfig, deleteConfig } = useSubtitleConfig();

  // Función de extracción de ID mejorada
  const extractVideoId = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();

    // Si ya es un ID de 11 caracteres
    if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSubtitleClick = useCallback((subtitle: Subtitle) => {
    playerRef.current?.seekTo(subtitle.startTime);
  }, []);

  const handleSave = async () => {
    // CAMBIO CRÍTICO: Limpiamos el ID justo antes de guardar
    const cleanId = extractVideoId(videoId);

    console.log("Intentando guardar:", {
      entradaOriginal: videoId,
      idLimpio: cleanId,
      nombre: configName,
    });

    if (!cleanId) {
      toast.error("URL o ID de video no válido");
      return;
    }

    if (!configName.trim()) {
      toast.error("Asigna un nombre a la lección");
      return;
    }

    try {
      const configData = {
        name: configName.trim(),
        video_id: cleanId, // <--- Enviamos el ID limpio garantizado
        start_time: startTime,
        end_time: endTime,
        subtitles: subtitles,
        translations: translations,
        repeat_enabled: repeatConfig?.enabled || false,
        repeat_start_time: repeatConfig?.startTime || 0,
        repeat_end_time: repeatConfig?.endTime || 0,
        repeat_count: repeatConfig?.repeatCount || 0,
        is_active: true,
        category: "general",
        difficulty: "medium",
      };

      await saveConfig(configData as any);
      toast.success("¡Guardado con éxito!");
      onSuccess();
      onOpenChange(false);

      // Resetear formulario
      setVideoId("");
      setConfigName("");
    } catch (error) {
      console.error("Error al guardar en Supabase:", error);
      toast.error("Error al guardar en la base de datos");
    }
  };

  const handleLoadConfig = async (id: string) => {
    const config = await loadConfig(id);
    if (config) {
      setVideoId(config.video_id || "");
      setStartTime(config.start_time || 0);
      setEndTime(config.end_time || 0);
      setSubtitles(config.subtitles || []);
      setTranslations(config.translations || []);
      setConfigName(config.name || "");
      // ... resto de carga de repeatConfig
    }
  };

  const currentSubtitle = getCurrentSubtitle(subtitles, currentTime);
  const currentTranslation = getCurrentSubtitle(translations, currentTime);

  // ID para el reproductor en tiempo real
  const activePlayerId = extractVideoId(videoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 bg-background overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Film className="w-5 h-5 text-primary" />
            Configurador de Clips e Intérprete
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Panel de Control */}
            <div className="space-y-6">
              <Tabs defaultValue="new">
                <TabsList className="w-full">
                  <TabsTrigger value="new" className="flex-1">
                    Nueva Importación
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="flex-1">
                    Existentes ({configs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nombre de la lección</Label>
                    <Input
                      placeholder="Ej: Escena de Friends"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                    />
                  </div>

                  <ConfigPanel
                    // Importante: Pasamos el valor tal cual para que el usuario pueda pegar la URL
                    onVideoChange={(val) => setVideoId(val)}
                    onTimeRangeChange={(start, end) => {
                      setStartTime(start);
                      setEndTime(end);
                    }}
                    onSRTLoad={(content) => setSubtitles(parseSRT(content))}
                    onTranslationLoad={(content) => setTranslations(parseSRT(content))}
                    onRepeatConfigChange={setRepeatConfig}
                  />

                  {!activePlayerId && videoId && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>URL de YouTube no reconocida</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={handleSave} className="w-full gap-2 bg-primary hover:bg-primary/90">
                    <Save className="w-4 h-4" /> Guardar en Base de Datos
                  </Button>
                </TabsContent>

                <TabsContent value="saved" className="pt-4">
                  <SavedConfigsList
                    configs={configs}
                    isLoading={isLoading}
                    onLoad={handleLoadConfig}
                    onDelete={deleteConfig}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Panel de Visualización */}
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border bg-black aspect-video relative shadow-2xl">
                {activePlayerId ? (
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={activePlayerId}
                    startTime={startTime}
                    endTime={endTime}
                    onTimeUpdate={handleTimeUpdate}
                    onReady={() => {}}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted/10">
                    <p>Ingresa una URL de YouTube para comenzar</p>
                  </div>
                )}
              </div>

              {subtitles.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <SubtitleDisplay currentSubtitle={currentSubtitle} currentTranslation={currentTranslation} />
                  <div className="border rounded-xl h-[300px] overflow-hidden flex flex-col bg-card">
                    <div className="p-2 bg-muted/50 border-b text-xs font-bold uppercase tracking-tighter">
                      Timeline de Subtítulos
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SubtitleList
                        subtitles={subtitles}
                        currentTime={currentTime}
                        onSubtitleClick={handleSubtitleClick}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
