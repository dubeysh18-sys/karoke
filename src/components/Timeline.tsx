import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Flag } from 'lucide-react';
import { LyricLine, formatTime } from '@/types/editor';
import { LyricMarker } from '@/lib/lyricsTiming';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TimelineProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  lyrics: LyricLine[];
  markers: LyricMarker[];
  markerTargetIndex: number;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onDropMarker: () => void;
  onMarkerChange: (lineIndex: number, time: number) => void;
}

const WAVEFORM_BARS = 72;

const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  isPlaying,
  lyrics,
  markers,
  markerTargetIndex,
  onSeek,
  onTogglePlay,
  onDropMarker,
  onMarkerChange,
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const waveformRef = useRef<HTMLDivElement>(null);
  const [draggingMarkerIndex, setDraggingMarkerIndex] = useState<number | null>(null);

  const waveformPattern = useMemo(
    () =>
      Array.from({ length: WAVEFORM_BARS }, (_, index) => {
        const value = Math.abs(Math.sin(index * 0.48) + Math.cos(index * 0.2)) / 2;
        return Math.max(16, value * 100);
      }),
    [],
  );

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const waveform = waveformRef.current;
      if (!waveform || duration <= 0) return 0;

      const bounds = waveform.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
      return ratio * duration;
    },
    [duration],
  );

  useEffect(() => {
    if (draggingMarkerIndex === null) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextTime = timeFromClientX(event.clientX);
      onMarkerChange(draggingMarkerIndex, nextTime);
    };

    const handlePointerUp = () => {
      setDraggingMarkerIndex(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingMarkerIndex, onMarkerChange, timeFromClientX]);

  const handleWaveformClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      onSeek(timeFromClientX(event.clientX));
    },
    [duration, onSeek, timeFromClientX],
  );

  const handleMarkerPointerDown =
    (lineIndex: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (duration <= 0) return;
      setDraggingMarkerIndex(lineIndex);
    };

  return (
    <div className="bg-editor-timeline border-t border-border px-2 sm:px-4 py-2 sm:py-3">
      <div className="rounded-md border border-border bg-editor-surface px-2 py-2 mb-2 sm:mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Waveform Sync Lane
            </p>
            <p className="text-[10px] text-muted-foreground">
              {markerTargetIndex >= 0
                ? `Target boundary: Line ${markerTargetIndex + 1} → ${markerTargetIndex + 2}`
                : 'Add at least two lyric lines to place markers'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={onDropMarker}
            disabled={duration <= 0 || markerTargetIndex < 0}
          >
            <Flag className="w-3 h-3 mr-1" />
            Mark
          </Button>
        </div>

        <div
          ref={waveformRef}
          className="relative h-12 sm:h-16 rounded-md border border-border bg-background overflow-hidden touch-none"
          onClick={handleWaveformClick}
        >
          <div className="absolute inset-0 flex items-end gap-[2px] px-1 py-1 pointer-events-none">
            {waveformPattern.map((barHeight, index) => (
              <span
                key={index}
                className="flex-1 rounded-sm bg-muted"
                style={{ height: `${barHeight}%` }}
              />
            ))}
          </div>

          <div
            className="absolute top-0 bottom-0 w-px bg-primary/70 pointer-events-none"
            style={{ left: `${progress}%` }}
          />

          {markers.map((marker) => {
            const left = duration > 0 ? (marker.time / duration) * 100 : 0;
            const isActiveTarget = marker.lineIndex === markerTargetIndex;

            return (
              <button
                key={marker.id}
                onPointerDown={handleMarkerPointerDown(marker.lineIndex)}
                className={`absolute top-0 bottom-0 -translate-x-1/2 w-3 rounded-full touch-none transition-colors ${isActiveTarget ? 'bg-primary/45' : 'bg-accent/40 hover:bg-accent/60'
                  }`}
                style={{ left: `${left}%` }}
                title={`Boundary between line ${marker.lineIndex + 1} and ${marker.lineIndex + 2}`}
                aria-label={`Drag boundary between lyric line ${marker.lineIndex + 1} and ${marker.lineIndex + 2}`}
              >
                <span className="absolute top-1/2 left-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/90" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 touch-manipulation"
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground touch-manipulation"
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 touch-manipulation"
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
        <span className="font-mono text-xs text-muted-foreground min-w-[100px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="relative">
        {duration > 0 && (
          <div className="absolute inset-x-0 h-2 top-1/2 -translate-y-1/2 pointer-events-none z-0">
            {lyrics.map((line) => {
              const left = (line.startTime / duration) * 100;
              const width = ((line.endTime - line.startTime) / duration) * 100;
              const isActive = currentTime >= line.startTime && currentTime <= line.endTime;

              return (
                <div
                  key={line.id}
                  className={`absolute h-full rounded-sm transition-colors ${isActive ? 'bg-primary/40' : 'bg-primary/15'
                    }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}
          </div>
        )}

        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.05}
          onValueChange={([value]) => onSeek(value)}
          className="relative z-10"
        />
      </div>
    </div>
  );
};

export default Timeline;
