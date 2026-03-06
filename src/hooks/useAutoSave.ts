import { useEffect, useRef, useCallback } from 'react';
import { LyricLine, LyricStyle } from '@/types/editor';

const STORAGE_KEY = 'karaoke-studio-autosave';
const MAX_HISTORY = 50;

interface SavedState {
  lyrics: LyricLine[];
  lyricStyle: LyricStyle;
}

export function useAutoSave(
  lyrics: LyricLine[],
  lyricStyle: LyricStyle,
  onRestore: (state: SavedState) => void,
) {
  const historyRef = useRef<LyricLine[][]>([]);
  const historyIndexRef = useRef(-1);
  const skipNextPush = useRef(false);

  // Auto-save to localStorage
  useEffect(() => {
    const state: SavedState = { lyrics, lyricStyle };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [lyrics, lyricStyle]);

  // Push lyrics snapshot to history
  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (lyrics.length === 0 && historyRef.current.length === 0) return;

    const history = historyRef.current;
    // Trim redo states
    if (historyIndexRef.current < history.length - 1) {
      history.splice(historyIndexRef.current + 1);
    }
    history.push(JSON.parse(JSON.stringify(lyrics)));
    if (history.length > MAX_HISTORY) history.shift();
    historyIndexRef.current = history.length - 1;
  }, [lyrics]);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as SavedState;
        if (state.lyrics?.length > 0) {
          onRestore(state);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const undo = useCallback((): LyricLine[] | null => {
    const history = historyRef.current;
    if (historyIndexRef.current <= 0) return null;
    historyIndexRef.current--;
    skipNextPush.current = true;
    return JSON.parse(JSON.stringify(history[historyIndexRef.current]));
  }, []);

  const redo = useCallback((): LyricLine[] | null => {
    const history = historyRef.current;
    if (historyIndexRef.current >= history.length - 1) return null;
    historyIndexRef.current++;
    skipNextPush.current = true;
    return JSON.parse(JSON.stringify(history[historyIndexRef.current]));
  }, []);

  return { undo, redo };
}
