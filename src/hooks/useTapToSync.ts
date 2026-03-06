import { useEffect, useCallback, useRef } from 'react';
import { LyricLine } from '@/types/editor';
import { applyBoundaryMarker, applyWaterflowTimingUpdate } from '@/lib/lyricsTiming';

interface UseTapToSyncProps {
  enabled: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lyrics: LyricLine[];
  onLyricsChange: (lyrics: LyricLine[]) => void;
}

export const useTapToSync = ({
  enabled,
  isPlaying,
  currentTime,
  duration,
  lyrics,
  onLyricsChange,
}: UseTapToSyncProps) => {
  const syncIndexRef = useRef(0);
  // Index tracks which boundary we're setting next.
  // Index 0 = start of line 0, then each subsequent tap sets the boundary (end of line N / start of line N+1).

  const resetSync = useCallback(() => {
    syncIndexRef.current = 0;
  }, []);

  const handleTap = useCallback(() => {
    if (!enabled || !isPlaying || lyrics.length === 0) return;

    const tapIndex = syncIndexRef.current;
    const maxDuration = duration > 0 ? duration : Number.POSITIVE_INFINITY;

    if (tapIndex === 0) {
      // First tap: set start of line 0
      const updated = applyWaterflowTimingUpdate({
        lyrics,
        index: 0,
        field: 'startTime',
        value: currentTime,
        audioDuration: maxDuration,
        enabled: true,
      });
      onLyricsChange(updated);
      syncIndexRef.current = 1;
      return;
    }

    // Subsequent taps: tapIndex N sets the boundary between line N-1 and line N
    const boundaryLineIndex = tapIndex - 1; // end of this line = start of next

    if (boundaryLineIndex >= lyrics.length - 1) {
      // Last line: just set end time
      const updated = applyWaterflowTimingUpdate({
        lyrics,
        index: lyrics.length - 1,
        field: 'endTime',
        value: currentTime,
        audioDuration: maxDuration,
        enabled: true,
      });
      onLyricsChange(updated);
      syncIndexRef.current = tapIndex + 1;
      return;
    }

    // Gapless chaining: end of line N = start of line N+1
    const updated = applyBoundaryMarker({
      lyrics,
      lineIndex: boundaryLineIndex,
      boundaryTime: currentTime,
      audioDuration: maxDuration,
    });
    onLyricsChange(updated);
    syncIndexRef.current = tapIndex + 1;
  }, [enabled, isPlaying, currentTime, duration, lyrics, onLyricsChange]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isTypingTarget) return;

      if (event.code === 'Space') {
        event.preventDefault();
        handleTap();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, handleTap]);

  const tapIndex = syncIndexRef.current;
  const currentSyncLine = tapIndex === 0 ? 0 : Math.min(tapIndex - 1, lyrics.length - 1);
  const isSettingStart = tapIndex === 0;
  const syncComplete = tapIndex > lyrics.length;

  return { resetSync, handleTap, currentSyncLine, isSettingStart, syncComplete };
};
