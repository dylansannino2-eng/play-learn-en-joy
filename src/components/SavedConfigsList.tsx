import { SubtitleConfig } from '@/hooks/useSubtitleConfig';
import { Button } from '@/components/ui/button';
import { Trash2, FolderOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SavedConfigsListProps {
  configs: SubtitleConfig[];
  isLoading: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SavedConfigsList({ configs, isLoading, onLoad, onDelete }: SavedConfigsListProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Cargando configuraciones...
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No hay configuraciones guardadas
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2 p-2">
        {configs.map((config) => (
          <div
            key={config.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {config.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {config.subtitles.length} subtítulos
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onLoad(config.id)}
                title="Cargar"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(config.id)}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
