import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfigPanel, RepeatConfig } from "@/components/ConfigPanel";
import { YouTubePlayer, YouTubePlayerRef } from "@/components/YouTubePlayer";
import { SubtitleDisplay } from "@/components/SubtitleDisplay";
import { SubtitleList } from "@/components/SubtitleList";
import { SavedConfigsList } from "@/components/SavedConfigsList";
import { parseSRT, getCurrentSubtitle, Subtitle } from "@/lib/srtParser";
import { useSubtitleConfig } from "@/hooks/useSubtitleConfig";
import { Save, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Para recargar la tabla al guardar
}

export function VideoImportModal({ open, onOpenChange, onSuccess }: VideoImportModalProps) {
  const [videoId, setVideoId] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [translations, setTranslations] = useState<Subtitle[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig | null>(null);
  const [configName, setConfigName] = useState("");

  const playerRef = useRef<YouTubePlayerRef>(null);
  const { configs, isLoading, saveConfig, loadConfig, deleteConfig } = useSubtitleConfig();

  // Resetear estados al cerrar/abrir si es necesario (opcional)
  const handleClose = () => {
    onOpenChange(false);
  };

  const extractVideoId = (input: string) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return match && match[2].length === 11 ? match[2] : input;
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSubtitleClick = useCallback((subtitle: Subtitle) => {
    playerRef.current?.seekTo(subtitle.startTime);
  }, []);

  const handleSave = async () => {
    const finalVideoId = extractVideoId(videoId);

    if (!finalVideoId) {
      toast.error("Debes ingresar un ID de video de YouTube");
      return;
    }

    try {
      const configData = {
        name: configName.trim() || "Sin nombre",
        video_id: finalVideoId,
        start_time: startTime,
        end_time: endTime,
        subtitles: subtitles,
        translations: translations,
        repeat_enabled: repeatConfig?.enabled || false,
        repeat_start_time: repeatConfig?.startTime || 0,
        repeat_end_time: repeatConfig?.endTime || 0,
        repeat_count: repeatConfig?.repeatCount || 0,
      };

      await saveConfig(configData);
      toast.success("¡Configuración guardada!");
      
      // Limpiar y cerrar
      setConfigName("");
      onSuccess(); // Recarga la tabla padre
      handleClose();
      
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar la configuración");
    }
  };

  const handleLoadConfig = async (id: string) => {
    const config = await loadConfig(id);
    if (config) {
      setVideoId(config.video_id);
      setStartTime(config.start_time);
      setEndTime(config.end_time);
      setSubtitles(config.subtitles || []);
      setTranslations(config.translations || []);
      setConfigName(config.name);

      if (config.repeat_enabled) {
        setRepeatConfig({
          enabled: true,
          startTime: config.repeat_start_time,
          endTime: config.repeat_end_time,
          repeatCount: config.repeat_count,
        });
      }
      toast.success("Configuración cargada para edición");
    }
  };

  const currentSubtitle = getCurrentSubtitle(subtitles, currentTime);
  const currentTranslation = getCurrentSubtitle(translations, currentTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 bg-background overflow-hidden">
        
        {/* Header del Modal */}
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Film className="w-5 h-5 text-primary" />
            Importador de Video y Subtítulos
          </DialogTitle>
          {/* Botón X personalizado si lo deseas, o usa el default del Dialog */}
        </DialogHeader>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            
            {/* Columna Izquierda: Controles */}
            <div className="space-y-6">
              <Tabs defaultValue="new" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="new">Nueva Importación</TabsTrigger>
                  <TabsTrigger value="saved">Cargar Existente ({configs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="config-name">Nombre de la lección</Label>
                    <Input
                      id="config-name"
                      placeholder="Ej: Matrix - Escena Lobby"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                    />
                  </div>

                  <ConfigPanel
                    onVideoChange={(val) => setVideoId(extractVideoId(val))}
                    onTimeRangeChange={(start, end) => {
                      setStartTime(start);
                      setEndTime(end);
                    }}
                    onSRTLoad={(content) => setSubtitles(parseSRT(content))}
                    onTranslationLoad={(content) => setTranslations(parseSRT(content))}
                    onRepeatConfigChange={setRepeatConfig}
                  />

                  <Button onClick={handleSave} className="w-full gap-2 mt-4" size="lg">
                    <Save className="w-4 h-4" />
                    Guardar e Importar al Panel
                  </Button>
                </TabsContent>

                <TabsContent value="saved" className="mt-4">
                  <SavedConfigsList
                    configs={configs}
                    isLoading={isLoading}
                    onLoad={handleLoadConfig}
                    onDelete={deleteConfig}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Columna Derecha: Previsualización */}
            <div className="space-y-4">
              {videoId ? (
                <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-black">
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={videoId}
                    startTime={startTime}
                    endTime={endTime}
                    onTimeUpdate={handleTimeUpdate}
                    onReady={() => {}}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted/50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border text-muted-foreground gap-2">
                  <Film className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Ingresa un ID de YouTube para previsualizar</p>
                </div>
              )}

              {subtitles.length > 0 && (
                <>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <SubtitleDisplay currentSubtitle={currentSubtitle} currentTranslation={currentTranslation} />
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[300px]">
                    <div className="p-3 border-b border-border bg-muted/30">
                      <h3 className="text-sm font-semibold">Línea de tiempo de Subtítulos</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SubtitleList subtitles={subtitles} currentTime={currentTime} onSubtitleClick={handleSubtitleClick} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
