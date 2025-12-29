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

  // Función robusta para extraer el ID de 11 caracteres
  const extractVideoId = (input: string) => {
    if (!input) return "";
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    const id = match && match[2].length === 11 ? match[2] : input;
    return id.trim();
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSubtitleClick = useCallback((subtitle: Subtitle) => {
    playerRef.current?.seekTo(subtitle.startTime);
  }, []);

  const handleSave = async () => {
    // IMPORTANTE: Limpiamos el ID antes de guardar para asegurar que video_id no sea una URL
    const cleanId = extractVideoId(videoId);

    if (!cleanId || cleanId.length !== 11) {
      toast.error("ID de video no válido (debe tener 11 caracteres)");
      return;
    }

    try {
      const configData = {
        name: configName.trim() || "Nueva Lección",
        video_id: cleanId, // Aquí se asigna el ID limpio
        start_time: startTime,
        end_time: endTime,
        subtitles: subtitles,
        translations: translations,
        repeat_enabled: repeatConfig?.enabled || false,
        repeat_start_time: repeatConfig?.startTime || 0,
        repeat_end_time: repeatConfig?.endTime || 0,
        repeat_count: repeatConfig?.repeatCount || 0,
      };

      console.log("Guardando configuración:", configData); // Para depuración

      const { error } = await saveConfig(configData as any);

      if (error) throw error;

      toast.success("¡Configuración guardada correctamente!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error al guardar:", error);
      toast.error(error.message || "Error al conectar con la base de datos");
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

      if (config.repeat_enabled) {
        setRepeatConfig({
          enabled: true,
          startTime: config.repeat_start_time || 0,
          endTime: config.repeat_end_time || 0,
          repeatCount: config.repeat_count || 0,
        });
      }
      toast.info(`Cargado: ${config.name}`);
    }
  };

  const currentSubtitle = getCurrentSubtitle(subtitles, currentTime);
  const currentTranslation = getCurrentSubtitle(translations, currentTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 bg-background overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Film className="w-5 h-5 text-primary" />
            Gestor de Contenido de Video
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background/50">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* PANEL IZQUIERDO: CONFIGURACIÓN */}
            <div className="space-y-6">
              <Tabs defaultValue="new" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="new">Configurar Nuevo</TabsTrigger>
                  <TabsTrigger value="saved">Biblioteca ({configs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="space-y-4 pt-2">
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="lesson-name" className="text-sm font-semibold text-muted-foreground">
                        Nombre de la lección
                      </Label>
                      <Input
                        id="lesson-name"
                        placeholder="Ej: Escena de Inception"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        className="bg-background"
                      />
                    </div>

                    <ConfigPanel
                      onVideoChange={(val) => setVideoId(val)} // Pasamos el valor tal cual, se limpia al guardar
                      onTimeRangeChange={(start, end) => {
                        setStartTime(start);
                        setEndTime(end);
                      }}
                      onSRTLoad={(content) => setSubtitles(parseSRT(content))}
                      onTranslationLoad={(content) => setTranslations(parseSRT(content))}
                      onRepeatConfigChange={setRepeatConfig}
                    />
                  </div>

                  <Button
                    onClick={handleSave}
                    className="w-full h-12 gap-2 text-lg font-bold shadow-lg shadow-primary/20"
                  >
                    <Save className="w-5 h-5" /> Guardar y Publicar
                  </Button>
                </TabsContent>

                <TabsContent value="saved">
                  <SavedConfigsList
                    configs={configs}
                    isLoading={isLoading}
                    onLoad={handleLoadConfig}
                    onDelete={deleteConfig}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* PANEL DERECHO: PREVISUALIZACIÓN */}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Vista Previa
                </Label>
                <div className="rounded-2xl overflow-hidden border-4 border-black bg-black aspect-video shadow-2xl">
                  {videoId ? (
                    <YouTubePlayer
                      ref={playerRef}
                      videoId={extractVideoId(videoId)}
                      startTime={startTime}
                      endTime={endTime}
                      onTimeUpdate={handleTimeUpdate}
                      onReady={() => console.log("Player listo")}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <Film className="w-12 h-12 opacity-20" />
                      <p className="text-sm italic">Ingresa una URL de YouTube para comenzar</p>
                    </div>
                  )}
                </div>
              </div>

              {subtitles.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <SubtitleDisplay currentSubtitle={currentSubtitle} currentTranslation={currentTranslation} />

                  <div className="border rounded-2xl h-[350px] overflow-hidden flex flex-col bg-card shadow-sm">
                    <div className="p-3 bg-muted/50 border-b flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Explorador de Subtítulos
                      </span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                        {subtitles.length} líneas
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
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
