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
  // Estados para capturar la información
  const [videoId, setVideoId] = useState("");
  const [configName, setConfigName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [translations, setTranslations] = useState<Subtitle[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig | null>(null);

  const playerRef = useRef<YouTubePlayerRef>(null);
  const { configs, isLoading, saveConfig, loadConfig, deleteConfig } = useSubtitleConfig();

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSubtitleClick = useCallback((subtitle: Subtitle) => {
    playerRef.current?.seekTo(subtitle.startTime);
  }, []);

  // --- FUNCIÓN DE GUARDADO MODIFICADA ---
  const handleSave = async () => {
    // Validamos que el ID no esté vacío
    if (!videoId.trim()) {
      toast.error("Debes ingresar el ID del video");
      return;
    }

    if (!configName.trim()) {
      toast.error("Por favor, asigna un nombre a la lección");
      return;
    }

    try {
      const configData = {
        name: configName.trim(),
        video_id: videoId.trim(), // Enviamos el ID tal cual lo escribiste en el campo
        start_time: startTime,
        end_time: endTime,
        subtitles: subtitles,
        translations: translations,
        repeat_enabled: repeatConfig?.enabled || false,
        repeat_start_time: repeatConfig?.startTime || 0,
        repeat_end_time: repeatConfig?.endTime || 0,
        repeat_count: repeatConfig?.repeatCount || 0,
        is_active: true, // Campo usualmente requerido
      };

      console.log("Guardando en base de datos:", configData);

      await saveConfig(configData as any);

      toast.success("¡Video e ID guardados correctamente!");
      onSuccess();
      onOpenChange(false);

      // Limpiar para el siguiente uso
      setVideoId("");
      setConfigName("");
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al conectar con la base de datos");
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
    }
  };

  const currentSubtitle = getCurrentSubtitle(subtitles, currentTime);
  const currentTranslation = getCurrentSubtitle(translations, currentTime);

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
            {/* Panel Izquierdo: Configuración */}
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
                      placeholder="Ej: Futurama - Escena 1"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                    />
                  </div>

                  {/* El ConfigPanel recibe la función para actualizar el videoId directamente */}
                  <ConfigPanel
                    onVideoChange={(val) => setVideoId(val)}
                    onTimeRangeChange={(start, end) => {
                      setStartTime(start);
                      setEndTime(end);
                    }}
                    onSRTLoad={(content) => setSubtitles(parseSRT(content))}
                    onTranslationLoad={(content) => setTranslations(parseSRT(content))}
                    onRepeatConfigChange={setRepeatConfig}
                  />

                  <Button onClick={handleSave} className="w-full gap-2">
                    <Save className="w-4 h-4" /> Guardar Configuración
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

            {/* Panel Derecho: Preview */}
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border bg-black aspect-video relative">
                {videoId ? (
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={videoId}
                    startTime={startTime}
                    endTime={endTime}
                    onTimeUpdate={handleTimeUpdate}
                    onReady={() => {}}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <p>Ingresa el ID del video para la vista previa</p>
                  </div>
                )}
              </div>

              {subtitles.length > 0 && (
                <div className="space-y-4">
                  <SubtitleDisplay currentSubtitle={currentSubtitle} currentTranslation={currentTranslation} />
                  <div className="border rounded-xl h-[300px] overflow-hidden flex flex-col">
                    <div className="p-2 bg-muted border-b text-xs font-bold uppercase">Línea de Tiempo</div>
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
