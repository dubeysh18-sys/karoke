import React, { useState } from 'react';
import { LyricLine, formatTime, generateId } from '@/types/editor';
import { Plus, Trash2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import LyricInlineEditor from '@/components/LyricInlineEditor';
import { applyWaterflowTimingUpdate } from '@/lib/lyricsTiming';

interface LyricsEditorProps {
  lyrics: LyricLine[];
  currentTime: number;
  duration: number;
  onLyricsChange: (lyrics: LyricLine[]) => void;
  onSeek: (time: number) => void;
  autoChain: boolean;
  onAutoChainChange: (v: boolean) => void;
  liveSyncIndex?: number;
}

const LyricsEditor: React.FC<LyricsEditorProps> = ({
  lyrics,
  currentTime,
  duration,
  onLyricsChange,
  onSeek,
  autoChain,
  onAutoChainChange,
  liveSyncIndex = -1,
}) => {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const addLine = () => {
    const lastLine = lyrics[lyrics.length - 1];
    const startTime = lastLine ? lastLine.endTime : 0;
    const newLine: LyricLine = {
      id: generateId(),
      text: '',
      startTime,
      endTime: startTime + 3,
    };
    onLyricsChange([...lyrics, newLine]);
  };

  const updateLine = (
    id: string,
    field: 'text' | 'startTime' | 'endTime',
    value: string | number,
  ) => {
    const index = lyrics.findIndex((line) => line.id === id);
    if (index < 0) return;

    if (field === 'text') {
      const nextValue = String(value);
      onLyricsChange(lyrics.map((line) => (line.id === id ? { ...line, text: nextValue } : line)));
      return;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) return;

    const updated = applyWaterflowTimingUpdate({
      lyrics,
      index,
      field,
      value,
      audioDuration: duration,
      enabled: autoChain,
    });

    onLyricsChange(updated);
  };

  const removeLine = (id: string) => {
    onLyricsChange(lyrics.filter((line) => line.id !== id));
  };

  const setStartToCurrent = (id: string) => {
    updateLine(id, 'startTime', currentTime);
  };

  const setEndToCurrent = (id: string) => {
    updateLine(id, 'endTime', currentTime);
  };

  const importBulk = () => {
    const lines = bulkText.split('\n').filter((line) => line.trim());
    const lineDuration = 3;
    const newLyrics: LyricLine[] = lines.map((text, index) => ({
      id: generateId(),
      text: text.trim(),
      startTime: index * lineDuration,
      endTime: (index + 1) * lineDuration,
    }));

    onLyricsChange(newLyrics);
    setBulkMode(false);
    setBulkText('');
  };

  const isActive = (line: LyricLine) => currentTime >= line.startTime && currentTime <= line.endTime;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Lyrics</h3>
        <div className="flex gap-1 items-center">
          <div className="flex items-center gap-1 mr-2" title="Auto-chain timestamps">
            <Link className={`w-3 h-3 ${autoChain ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              checked={autoChain}
              onCheckedChange={onAutoChainChange}
              className="scale-75"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setBulkMode(!bulkMode)}
          >
            {bulkMode ? 'Editor' : 'Bulk Import'}
          </Button>
          {!bulkMode && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={addLine}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {bulkMode ? (
        <div className="flex-1 flex flex-col p-3 gap-2">
          <p className="text-xs text-muted-foreground">Paste lyrics, one line per row:</p>
          <textarea
            className="flex-1 bg-editor-surface border border-border rounded-md p-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary scrollbar-thin"
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={'Line 1\nLine 2\nLine 3...'}
          />
          <Button size="sm" onClick={importBulk} disabled={!bulkText.trim()}>
            Import Lines
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {lyrics.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <p>No lyrics yet</p>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
              </Button>
            </div>
          )}

          {lyrics.map((line, index) => (
            <div
              key={line.id}
              ref={(el) => {
                if (el && liveSyncIndex === index) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className={`group rounded-md p-2 transition-colors cursor-pointer ${
                liveSyncIndex === index
                  ? 'bg-accent/20 border-2 border-accent ring-2 ring-accent/30'
                  : isActive(line)
                    ? 'bg-primary/15 border border-primary/30'
                    : 'hover:bg-editor-surface-hover border border-transparent'
              }`}
              onClick={() => onSeek(line.startTime)}
            >
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground mt-1.5 w-4 text-right shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <LyricInlineEditor
                    value={line.text}
                    onValueChange={(nextText) => updateLine(line.id, 'text', nextText)}
                    onClick={(event) => event.stopPropagation()}
                    className="min-h-[28px] bg-transparent border border-transparent hover:border-border focus-visible:border-border"
                    placeholder="Lyric text... (Enter for line break)"
                  />

                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setStartToCurrent(line.id);
                      }}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-editor-surface hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title="Set start to current time"
                    >
                      {formatTime(line.startTime)}
                    </button>
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setEndToCurrent(line.id);
                      }}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-editor-surface hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title="Set end to current time"
                    >
                      {formatTime(line.endTime)}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        removeLine(line.id);
                      }}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LyricsEditor;
