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
      toast.error("Debes ingresar un ID de video");
      return;
    }

    try {
      // CORRECCIÓN: Usamos snake_case para coincidir con SubtitleConfig
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

      await saveConfig(configData as any);
      toast.success("¡Configuración guardada!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  const handleLoadConfig = async (id: string) => {
    const config = await loadConfig(id);
    if (config) {
      // CORRECCIÓN: Leemos desde snake_case
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
  };

  const currentSubtitle = getCurrentSubtitle(subtitles, currentTime);
  const currentTranslation = getCurrentSubtitle(translations, currentTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 bg-background overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Film className="w-5 h-5 text-primary" />
            Importador de Video
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-6">
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
                      placeholder="Ej: Matrix Scene"
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
                  <Button onClick={handleSave} className="w-full gap-2">
                    <Save className="w-4 h-4" /> Guardar
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
              <div className="rounded-xl overflow-hidden border bg-black aspect-video">
                {videoId && (
                  <YouTubePlayer
                    ref={playerRef}
                    videoId={videoId}
                    startTime={startTime}
                    endTime={endTime}
                    onTimeUpdate={handleTimeUpdate}
                  />
                )}
              </div>
              {subtitles.length > 0 && (
                <div className="space-y-4">
                  <SubtitleDisplay currentSubtitle={currentSubtitle} currentTranslation={currentTranslation} />
                  <div className="border rounded-xl h-[300px] overflow-hidden flex flex-col">
                    <div className="p-2 bg-muted border-b text-sm font-bold">Línea de Tiempo</div>
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
