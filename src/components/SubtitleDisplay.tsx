import { Subtitle } from "@/lib/srtParser";
import { cn } from "@/lib/utils";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubtitleDisplayProps {
  currentSubtitle: Subtitle | null;
  currentTranslation: Subtitle | null;
  isLoading?: boolean;
  isRepeating?: boolean;
  currentIndex?: number;
  totalSubtitles?: number;
  onSave?: (subtitle: Subtitle) => void;
}

function renderTextWithBlanks(text: string) {
  const blankPattern = /(\_{2,}|\[blank\]|\{blank\}|\*\w+\*)/gi;
  const parts = text.split(blankPattern);

  return parts.map((part, i) => {
    if (part.match(/^\_{2,}$/) || part.match(/^\[blank\]$/i) || part.match(/^\{blank\}$/i) || part.match(/^\*\w+\*$/)) {
      return (
        <span
          key={i}
          className="inline-block min-w-[80px] mx-1 border-b-2 border-primary bg-primary/10 rounded px-2 py-0.5"
        >
          &nbsp;
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function SubtitleDisplay({
  currentSubtitle,
  currentTranslation,
  isLoading,
  isRepeating,
  currentIndex,
  totalSubtitles,
  onSave,
}: SubtitleDisplayProps) {
  if (isLoading) {
    return (
      <div className="subtitle-card min-h-[140px] flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse-subtle">Cargando subtítulos...</p>
      </div>
    );
  }

  if (!currentSubtitle && !currentTranslation) {
    return (
      <div className="subtitle-card min-h-[140px] flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Los subtítulos aparecerán aquí cuando el video esté reproduciéndose
        </p>
      </div>
    );
  }

  const mainText = currentSubtitle?.text.replace(/\n/g, " ") || "";
  const translationText = currentTranslation?.text.replace(/\n/g, " ") || "";

  return (
    <div
      className={cn(
        "subtitle-card min-h-[140px] flex flex-col justify-center gap-4 animate-fade-in transition-colors relative",
        isRepeating && "border-blue-500/50 bg-blue-500/5",
      )}
    >
      {/* Contador y botón guardar */}
      {totalSubtitles && totalSubtitles > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {currentIndex !== undefined ? currentIndex + 1 : 0}/{totalSubtitles}
          </span>
          {currentSubtitle && onSave && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onSave(currentSubtitle)}
              title="Guardar subtítulo"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Texto principal */}
      {mainText && (
        <p
          className={cn(
            "text-center text-xl md:text-2xl leading-relaxed font-semibold transition-colors",
            isRepeating ? "text-blue-400" : "text-foreground",
          )}
        >
          {renderTextWithBlanks(mainText)}
        </p>
      )}

      {/* Traducción */}
      {translationText && (
        <p
          className={cn(
            "text-center text-base md:text-lg leading-relaxed italic transition-colors",
            isRepeating ? "text-blue-300/80" : "text-muted-foreground/80",
          )}
        >
          {renderTextWithBlanks(translationText)}
        </p>
      )}
    </div>
  );
}
