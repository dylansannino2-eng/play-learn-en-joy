import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Play, Link, Repeat } from 'lucide-react';

interface RepeatConfig {
  startTime: number;
  endTime: number;
  repeatCount: number;
  enabled: boolean;
}

interface ConfigPanelProps {
  onVideoChange: (videoId: string) => void;
  onTimeRangeChange: (start: number, end: number) => void;
  onSRTLoad: (content: string) => void;
  onTranslationLoad: (content: string) => void;
  onRepeatConfigChange: (config: RepeatConfig) => void;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function ConfigPanel({ onVideoChange, onTimeRangeChange, onSRTLoad, onTranslationLoad, onRepeatConfigChange }: ConfigPanelProps) {
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('');
  const [mainFileName, setMainFileName] = useState('');
  const [translationFileName, setTranslationFileName] = useState('');
  const [repeatStart, setRepeatStart] = useState('');
  const [repeatEnd, setRepeatEnd] = useState('');
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  const handleLoadVideo = () => {
    const videoId = extractVideoId(url);
    if (videoId) {
      onVideoChange(videoId);
      
      const startSeconds = parseTime(startTime);
      const endSeconds = endTime ? parseTime(endTime) : 0;
      onTimeRangeChange(startSeconds, endSeconds);
    }
  };

  const parseTime = (time: string): number => {
    // Soporta formato mm:ss, mm:ss.mmm, hh:mm:ss, hh:mm:ss.mmm
    const [mainPart, msPart] = time.split('.');
    const parts = mainPart.split(':').map(Number);
    const ms = msPart ? parseInt(msPart.padEnd(3, '0').slice(0, 3)) / 1000 : 0;
    
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1] + ms;
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2] + ms;
    }
    return 0;
  };

  const handleMainFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMainFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onSRTLoad(content);
    };
    reader.readAsText(file);
  };

  const handleTranslationFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTranslationFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onTranslationLoad(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="config-panel space-y-5">
      <div className="space-y-2">
        <Label htmlFor="youtube-url" className="text-sm font-medium">
          URL de YouTube
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="youtube-url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start-time" className="text-sm font-medium">
            Inicio (mm:ss)
          </Label>
          <Input
            id="start-time"
            placeholder="00:00"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time" className="text-sm font-medium">
            Fin (mm:ss)
          </Label>
          <Input
            id="end-time"
            placeholder="05:00"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Subtítulos (Original)</Label>
        <div className="relative">
          <input
            type="file"
            accept=".srt"
            onChange={handleMainFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center gap-3 p-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-accent/30 transition-colors">
            <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {mainFileName || 'Archivo .srt original'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Subtítulos (Traducción)</Label>
        <div className="relative">
          <input
            type="file"
            accept=".srt"
            onChange={handleTranslationFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center gap-3 p-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-accent/30 transition-colors">
            <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {translationFileName || 'Archivo .srt traducción (opcional)'}
            </span>
          </div>
        </div>
      </div>

      {/* Repetición de fragmento */}
      <div className="space-y-3 p-3 border border-border rounded-lg bg-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Repetir fragmento (3x)</Label>
          </div>
          <Switch
            checked={repeatEnabled}
            onCheckedChange={(checked) => {
              setRepeatEnabled(checked);
              if (!checked) {
                onRepeatConfigChange({ startTime: 0, endTime: 0, repeatCount: 3, enabled: false });
              }
            }}
          />
        </div>
        
        {repeatEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="repeat-start" className="text-xs text-muted-foreground">
                Inicio (mm:ss.mmm)
              </Label>
              <Input
                id="repeat-start"
                placeholder="00:30.500"
                value={repeatStart}
                onChange={(e) => setRepeatStart(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="repeat-end" className="text-xs text-muted-foreground">
                Fin (mm:ss.mmm)
              </Label>
              <Input
                id="repeat-end"
                placeholder="00:45.750"
                value={repeatEnd}
                onChange={(e) => setRepeatEnd(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button
              onClick={() => {
                const start = parseTime(repeatStart);
                const end = parseTime(repeatEnd);
                if (start < end) {
                  onRepeatConfigChange({ startTime: start, endTime: end, repeatCount: 3, enabled: true });
                }
              }}
              className="col-span-2 h-8 text-sm"
              variant="secondary"
            >
              Activar repetición
            </Button>
          </div>
        )}
      </div>

      <Button onClick={handleLoadVideo} className="w-full gap-2" size="lg">
        <Play className="w-4 h-4" />
        Cargar Video
      </Button>
    </div>
  );
}

export type { RepeatConfig };
