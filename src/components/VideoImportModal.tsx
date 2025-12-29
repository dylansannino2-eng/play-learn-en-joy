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

  const extractVideoId = (input: string) => {
    if (!input) return "";
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return match && match[2].length === 11 ? match[2] : input.trim();
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSubtitleClick = useCallback((subtitle: Subtitle) => {
    playerRef.current?.seekTo(subtitle.startTime);
  }, []);

  const handleSave = async () => {
    const cleanId = extractVideoId(videoId);

    if (!cleanId || cleanId.length !== 11) {
      toast.error("ID de video no válido (debe tener 11 caracteres)");
      return;
    }

    try {
      // Mapeamos los datos exactamente como los espera la base de datos (snake_case)
      const configData = {
        name: configName.trim() || "Nueva Lección",
        video_id: cleanId,
        start_time: startTime,
        end_time: endTime,
        subtitles: subtitles,
        translations: translations,
        repeat_enabled: !!repeatConfig?.enabled,
        repeat_start_time: repeatConfig?.startTime || 0,
        repeat_end_time: repeatConfig?.endTime || 0,
        repeat_count: repeatConfig?.repeatCount || 0,
      };

      // CORRECCIÓN TS2339: No desestructuramos { error } porque saveConfig devuelve el objeto directamente
      await saveConfig(configData as any);

      toast.success("¡Configuración guardada correctamente!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error al guardar:", err);
      toast.error("Error al guardar en la base de datos");
    }
  };

  const handleLoadConfig = async (id: string) => {
    try {
      const config = await loadConfig(id);
      if (config) {
        setVideoId(config.video_id || "");
        setStartTime(config.start_time || 0);
        setEndTime(config.end_time || 0);
        setSubtitles(config.subtitles || []);
        setTranslations(config.translations || []);
        setConfigName(config.name || "");

        if (config.repeat_enabled) {
          setRepeatConfig({
            enabled: true,
            startTime: config.repeat_start_time || 0,
            endTime: config.repeat_end_time || 0,
            repeatCount: config.repeat_count || 0,
          });
        }
      }
    } catch (err) {
      toast.error("Error al cargar la configuración");
    }
  };

  const currentSubtitle = getCurrentSubtitle(subtitles, currentTime);
  const currentTranslation = getCurrentSubtitle(translations, currentTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 bg-background overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Film className="w-5 h-5 text-primary" />
            Importador de Video
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Tabs defaultValue="new" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="new">Nueva Importación</TabsTrigger>
                  <TabsTrigger value="saved">Guardados ({configs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nombre de la lección</Label>
                    <Input
                      placeholder="Ej: Matrix Scene"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                    />
                  </div>

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

                  <Button onClick={handleSave} className="w-full gap-2 h-12 text-lg">
                    <Save className="w-5 h-5" /> Guardar Configuración
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

            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border-4 border-black bg-black aspect-video shadow-xl">
                {videoId && (
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={extractVideoId(videoId)}
                    startTime={startTime}
                    endTime={endTime}
                    onTimeUpdate={handleTimeUpdate}
                    onReady={() => {}}
                  />
                )}
              </div>

              {subtitles.length > 0 && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <SubtitleDisplay currentSubtitle={currentSubtitle} currentTranslation={currentTranslation} />
                  <div className="border rounded-xl h-[300px] overflow-hidden flex flex-col bg-card">
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
