import { Subtitle, formatTime } from "@/lib/srtParser";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubtitleListProps {
  subtitles: Subtitle[];
  currentTime: number;
  onSeek?: (time: number) => void;
  // 👇 NUEVA PROPIEDAD AGREGADA
  onSubtitleClick?: (subtitle: Subtitle) => void;
}

export function SubtitleList({
  subtitles,
  currentTime,
  onSubtitleClick, // 👈 Recibimos la prop aquí
}: SubtitleListProps) {
  if (subtitles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm text-center">
          Carga un archivo SRT para ver la lista de subtítulos
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
        {subtitles.map((sub) => {
          const isActive = currentTime >= sub.startTime && currentTime <= sub.endTime;

          return (
            <div
              key={sub.id}
              // 👇 AGREGADO: Al hacer click, ejecutamos la función
              onClick={() => onSubtitleClick?.(sub)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isActive ? "bg-primary/20 border-primary shadow-sm" : "bg-card border-border hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-mono ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {formatTime(sub.startTime)} - {formatTime(sub.endTime)}
                </span>
              </div>
              <div
                className={`text-sm leading-relaxed ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {sub.text.split("\n").map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
