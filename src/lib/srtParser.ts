export interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export function parseSRT(srtContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const id = parseInt(lines[0], 10);
    const timeLine = lines[1];
    const text = lines.slice(2).join('\n');

    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );

    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    subtitles.push({ id, startTime, endTime, text });
  }

  return subtitles;
}

export function getCurrentSubtitle(subtitles: Subtitle[], currentTime: number): Subtitle | null {
  return subtitles.find(
    (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
  ) || null;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeInput(value: string): number {
  const parts = value.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}
