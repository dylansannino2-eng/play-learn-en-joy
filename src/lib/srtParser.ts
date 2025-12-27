export interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export function parseSrt(srtContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const id = parseInt(lines[0], 10);
    if (isNaN(id)) continue;

    const timeMatch = lines[1].match(
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

    const text = lines.slice(2).join('\n');

    subtitles.push({ id, startTime, endTime, text });
  }

  return subtitles;
}

export function findSubtitleAtTime(subtitles: Subtitle[], currentTime: number): Subtitle | null {
  return subtitles.find(
    (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
  ) || null;
}
