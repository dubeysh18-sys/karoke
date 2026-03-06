import { LyricLine } from '@/types/editor';

const MIN_LINE_DURATION = 0.01;
const MAX_FALLBACK_DURATION = Number.POSITIVE_INFINITY;

const resolveAudioDuration = (audioDuration: number) =>
  audioDuration > 0 ? audioDuration : MAX_FALLBACK_DURATION;

export const clampTime = (time: number, audioDuration: number) => {
  const maxDuration = resolveAudioDuration(audioDuration);
  return Math.max(0, Math.min(time, maxDuration));
};

interface WaterflowUpdateParams {
  lyrics: LyricLine[];
  index: number;
  field: 'startTime' | 'endTime';
  value: number;
  audioDuration: number;
  enabled?: boolean;
}

const applyManualTimingUpdate = (
  lyrics: LyricLine[],
  index: number,
  field: 'startTime' | 'endTime',
  value: number,
  audioDuration: number,
) => {
  const clampedValue = clampTime(value, audioDuration);
  const updated = lyrics.map((line, lineIndex) => {
    if (lineIndex !== index) return line;

    const nextLine = { ...line, [field]: clampedValue };

    if (field === 'startTime' && nextLine.startTime > nextLine.endTime) {
      nextLine.endTime = nextLine.startTime;
    }

    if (field === 'endTime' && nextLine.endTime < nextLine.startTime) {
      nextLine.startTime = nextLine.endTime;
    }

    nextLine.endTime = Math.min(nextLine.endTime, resolveAudioDuration(audioDuration));
    return nextLine;
  });

  return updated;
};

export const applyWaterflowTimingUpdate = ({
  lyrics,
  index,
  field,
  value,
  audioDuration,
  enabled = true,
}: WaterflowUpdateParams): LyricLine[] => {
  if (index < 0 || index >= lyrics.length) return lyrics;

  if (!enabled) {
    return applyManualTimingUpdate(lyrics, index, field, value, audioDuration);
  }

  const maxDuration = resolveAudioDuration(audioDuration);
  const updated = lyrics.map((line) => ({ ...line }));
  const clampedValue = clampTime(value, maxDuration);

  updated[index][field] = clampedValue;

  if (field === 'startTime' && index > 0) {
    updated[index - 1].endTime = clampedValue;
  }

  if (field === 'endTime' && index < updated.length - 1) {
    updated[index + 1].startTime = clampedValue;
  }

  const requestedDurations = updated.map((line) =>
    Math.max(MIN_LINE_DURATION, line.endTime - line.startTime),
  );

  if (updated.length > 0) {
    updated[0].startTime = clampTime(updated[0].startTime, maxDuration);
  }

  for (let lineIndex = 0; lineIndex < updated.length; lineIndex += 1) {
    if (lineIndex > 0) {
      updated[lineIndex].startTime = updated[lineIndex - 1].endTime;
    }

    updated[lineIndex].startTime = clampTime(updated[lineIndex].startTime, maxDuration);

    const requestedEnd = updated[lineIndex].startTime + requestedDurations[lineIndex];
    updated[lineIndex].endTime = Math.min(maxDuration, requestedEnd);

    if (updated[lineIndex].endTime < updated[lineIndex].startTime) {
      updated[lineIndex].endTime = updated[lineIndex].startTime;
    }
  }

  // Re-pin boundaries to guarantee zero-gap chaining.
  for (let lineIndex = 1; lineIndex < updated.length; lineIndex += 1) {
    updated[lineIndex].startTime = updated[lineIndex - 1].endTime;
  }

  return updated;
};

interface BoundaryMarkerParams {
  lyrics: LyricLine[];
  lineIndex: number;
  boundaryTime: number;
  audioDuration: number;
}

export const applyBoundaryMarker = ({
  lyrics,
  lineIndex,
  boundaryTime,
  audioDuration,
}: BoundaryMarkerParams): LyricLine[] => {
  if (lineIndex < 0 || lineIndex >= lyrics.length - 1) return lyrics;

  return applyWaterflowTimingUpdate({
    lyrics,
    index: lineIndex,
    field: 'endTime',
    value: boundaryTime,
    audioDuration,
    enabled: true,
  });
};

export interface LyricMarker {
  id: string;
  lineIndex: number;
  time: number;
}

export const buildLyricMarkers = (lyrics: LyricLine[]): LyricMarker[] =>
  lyrics.slice(0, -1).map((line, lineIndex) => ({
    id: `${line.id}-boundary`,
    lineIndex,
    time: line.endTime,
  }));
