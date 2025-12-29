import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// Reutilizamos la interfaz o la importamos de tus tipos
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
  target_subtitle_index: number | null;
  hidden_word: string | null;
  hidden_word_index: number | null;
  difficulty: string | null;
  category: string | null;
}

interface ClipPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SubtitleConfig | null;
}

export function ClipPreviewModal({ open, onOpenChange, config }: ClipPreviewModalProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Resetear estado al abrir/cerrar o cambiar config
  useEffect(() => {
    if (open) {
      setUserAnswer("");
      setFeedback("idle");
    }
  }, [open, config]);

  if (!config || !config.video_id) return null;

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!config.hidden_word) return;

    // Comparación simple ignorando mayúsculas y espacios
    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanTarget = config.hidden_word.trim().toLowerCase();

    if (cleanUser === cleanTarget) {
      setFeedback("success");
      toast.success("¡Correcto! Así se verá en el juego.");
    } else {
      setFeedback("error");
      toast.error(`Incorrecto. La palabra era: ${config.hidden_word}`);
    }
  };

  const handleReplay = () => {
    // Truco para reiniciar el iframe src y que vuelva a cargar desde el inicio
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    setFeedback("idle");
    setUserAnswer("");
  };

  // Construir URL de embed de YouTube con tiempos
  const startSeconds = Math.floor(config.start_time || 0);
  const endSeconds = Math.ceil(config.end_time || 0);
  const embedUrl = `https://www.youtube.com/embed/${config.video_id}?start=${startSeconds}&end=${endSeconds}&autoplay=1&cc_load_policy=0&controls=0&modestbranding=1&rel=0`;

  // Renderizar subtítulo con el input en el lugar correcto
  const renderGameSubtitle = () => {
    if (
      !config.subtitles ||
      config.target_subtitle_index === null ||
      config.hidden_word_index === null
    ) {
      return <p className="text-red-500">Configuración incompleta para jugar.</p>;
    }

    const targetSub = config.subtitles[config.target_subtitle_index];
    if (!targetSub) return null;

    const words = targetSub.text.split(/\s+/);

    return (
      <div className="flex flex-wrap items-center justify-center gap-2 text-lg font-medium leading-relaxed p-4 bg-muted/30 rounded-xl border-2 border-dashed border-primary/20">
        {words.map((word, idx) => {
          // Limpiar puntuación para comparar índices visualmente si es necesario, 
          // pero usaremos el índice guardado.
          if (idx === config.hidden_word_index) {
            return (
              <form key={idx} onSubmit={handleCheck} className="inline-flex">
                <Input
                  autoFocus
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className={`w-32 h-8 text-center border-b-2 border-t-0 border-x-0 rounded-none px-1 focus-visible:ring-0 ${
                    feedback === "success"
                      ? "border-green-500 text-green-600 font-bold"
                      : feedback === "error"
                      ? "border-red-500 text-red-500"
                      : "border-primary"
                  }`}
                  placeholder="???"
                  disabled={feedback === "success"}
                />
              </form>
            );
          }
          return <span key={idx}>{word}</span>;
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa: {config.name}</span>
            <Badge variant="outline" className="ml-2 capitalize">
              {config.difficulty}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Video Player */}
          <div className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-2xl">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="absolute top-0 left-0 w-full h-full pointer-events-none" // pointer-events-none para evitar pausar clicando el video (estilo juego)
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Área de Juego */}
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-400 uppercase tracking-widest">
              Completa la frase escuchada
            </p>
            
            {renderGameSubtitle()}

            <div className="flex justify-center gap-3 pt-2">
              <Button 
                variant="secondary" 
                onClick={handleReplay}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Repetir Clip
              </Button>
              
              {feedback !== "success" && (
                <Button 
                    onClick={() => handleCheck()} 
                    className="bg-primary hover:bg-primary/90 gap-2"
                >
                    <Play className="w-4 h-4" /> Comprobar
                </Button>
              )}
              
              {feedback === "success" && (
                  <Button className="bg-green-600 hover:bg-green-700 cursor-default">
                      <CheckCircle className="w-4 h-4 mr-2" /> ¡Correcto!
                  </Button>
              )}
               {feedback === "error" && (
                  <Button variant="destructive" className="cursor-default">
                      <XCircle className="w-4 h-4 mr-2" /> Inténtalo de nuevo
                  </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
