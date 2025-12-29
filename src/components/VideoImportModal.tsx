import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfigPanel, RepeatConfig } from "@/components/ConfigPanel";
import { YouTubePlayer, YouTubePlayerRef } from "@/components/YouTubePlayer";
import { SubtitleDisplay } from "@/components/SubtitleDisplay";
import { SubtitleList } from "@/components/SubtitleList";
import { SavedConfigsList } from "@/components/SavedConfigsList";
import { parseSRT, getCurrentSubtitle, Subtitle } from "@/lib/srtParser";
import { useSubtitleConfig } from "@/hooks/useSubtitleConfig";
import { Save, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
      /**
       * CORRECCIÓN 1: Mapeo de nombres de propiedades.
       * Si tu interfaz/DB pide videoId (camelCase), úsalo.
       * Si pide video_id (snake_case), asegúrate de que el tipo coincida.
       * Aquí lo ajusto según el error TS2739 que mencionaste.
       */
      const configData = {
        name: configName.trim() || "Sin nombre",
        videoId: finalVideoId, // Antes video_id
        startTime: startTime, // Antes start_time
        endTime: endTime, // Antes end_time
        subtitles: subtitles,
        translations: translations,
        // Agrupamos la repetición en el objeto que espera el tipo
        repeatConfig: {
          enabled: repeatConfig?.enabled || false,
          startTime: repeatConfig?.startTime || 0,
          endTime: repeatConfig?.endTime || 0,
          count: repeatConfig?.repeatCount || 0,
        },
      };

      await saveConfig(configData as any); // Usamos any temporalmente si la interfaz de saveConfig aún es vieja
      toast.success("¡Configuración guardada!");

      setConfigName("");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar la configuración");
    }
  };

  const handleLoadConfig = async (id: string) => {
    const config = await loadConfig(id);
    if (config) {
      // Ajustar estas lecturas según cómo devuelva los datos tu hook
      setVideoId(config.videoId || config.video_id);
      setStartTime(config.startTime || config.start_time);
      setEndTime(config.endTime || config.end_time);
      setSubtitles(config.subtitles || []);
      setTranslations(config.translations || []);
      setConfigName(config.name);

      const r = config.repeatConfig;
      if (r || config.repeat_enabled) {
        setRepeatConfig({
          enabled: r?.enabled ?? config.repeat_enabled,
          startTime: r?.startTime ?? config.repeat_start_time,
          endTime: r?.endTime ?? config.repeat_end_time,
          repeatCount: r?.count ?? config.repeat_count,
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
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Film className="w-5 h-5 text-primary" />
            Importador de Video y Subtítulos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            <div className="space-y-6">
              <Tabs defaultValue="new" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="new">Nueva Importación</TabsTrigger>
                  <TabsTrigger value="saved">Existentes ({configs.length})</TabsTrigger>
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
                      <h3 className="text-sm font-semibold">Línea de tiempo</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {/* CORRECCIÓN 2: Si SubtitleList da error, asegúrate de 
                        que su archivo acepte la prop onSubtitleClick.
                      */}
                      <SubtitleList
                        subtitles={subtitles}
                        currentTime={currentTime}
                        onSubtitleClick={handleSubtitleClick}
                      />
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
