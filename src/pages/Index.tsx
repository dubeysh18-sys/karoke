import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LyricLine, LyricStyle, DEFAULT_LYRIC_STYLE } from '@/types/editor';
import MediaUpload from '@/components/MediaUpload';
import VideoPreview from '@/components/VideoPreview';
import LyricsEditor from '@/components/LyricsEditor';
import LyricsStylePanel from '@/components/LyricsStylePanel';
import Timeline from '@/components/Timeline';
import ExportButton from '@/components/ExportButton';
import { useTapToSync } from '@/hooks/useTapToSync';
import FloatingButterflies from '@/components/FloatingButterflies';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Clapperboard, Mic, Undo2, Redo2, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { applyBoundaryMarker, buildLyricMarkers } from '@/lib/lyricsTiming';

const Index = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyricStyle, setLyricStyle] = useState<LyricStyle>(DEFAULT_LYRIC_STYLE);
  const [autoChain, setAutoChain] = useState(true);
  const [liveSyncMode, setLiveSyncMode] = useState(false);
  const [markerCursor, setMarkerCursor] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null!);
  const rafRef = useRef<number>(0);

  const { undo, redo } = useAutoSave(lyrics, lyricStyle, (state) => {
    setLyrics(state.lyrics);
    setLyricStyle(state.lyricStyle);
  });

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) setLyrics(prev);
  }, [undo]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) setLyrics(next);
  }, [redo]);

  // Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const { resetSync, handleTap, currentSyncLine, isSettingStart, syncComplete } = useTapToSync({
    enabled: liveSyncMode,
    isPlaying,
    currentTime,
    duration,
    lyrics,
    onLyricsChange: setLyrics,
  });

  const markers = useMemo(() => buildLyricMarkers(lyrics), [lyrics]);

  const activeLyricIndex = useMemo(() => {
    for (let index = 0; index < lyrics.length; index += 1) {
      if (currentTime >= lyrics[index].startTime && currentTime <= lyrics[index].endTime) {
        return index;
      }
    }
    return -1;
  }, [currentTime, lyrics]);

  const markerTargetIndex = useMemo(() => {
    if (lyrics.length < 2) return -1;
    if (activeLyricIndex >= 0 && activeLyricIndex < lyrics.length - 1) {
      return activeLyricIndex;
    }
    return Math.min(markerCursor, lyrics.length - 2);
  }, [activeLyricIndex, lyrics.length, markerCursor]);

  useEffect(() => {
    setMarkerCursor((cursor) => Math.min(cursor, Math.max(lyrics.length - 2, 0)));
  }, [lyrics.length]);

  const handleAudioFile = useCallback((file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    audioRef.current = audio;
  }, []);

  const handleVideoFile = useCallback((file: File) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  }, []);

  const syncLoop = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setCurrentTime(audio.currentTime);
      if (videoRef.current && Math.abs(videoRef.current.currentTime - audio.currentTime) > 0.3) {
        videoRef.current.currentTime = audio.currentTime;
      }
    }
    rafRef.current = requestAnimationFrame(syncLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [syncLoop]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      videoRef.current?.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
    if (videoRef.current) videoRef.current.currentTime = time;
  }, []);

  const applyBoundaryAt = useCallback(
    (lineIndex: number, time: number) => {
      const maxDuration = duration > 0 ? duration : Number.POSITIVE_INFINITY;
      setLyrics((prev) =>
        applyBoundaryMarker({ lyrics: prev, lineIndex, boundaryTime: time, audioDuration: maxDuration }),
      );
    },
    [duration],
  );

  const handleDropMarker = useCallback(() => {
    if (markerTargetIndex < 0) return;
    applyBoundaryAt(markerTargetIndex, currentTime);
    setMarkerCursor(Math.min(markerTargetIndex + 1, Math.max(lyrics.length - 2, 0)));
  }, [applyBoundaryAt, currentTime, lyrics.length, markerTargetIndex]);

  const handleMarkerChange = useCallback(
    (lineIndex: number, time: number) => {
      applyBoundaryAt(lineIndex, time);
      setMarkerCursor(Math.min(lineIndex + 1, Math.max(lyrics.length - 2, 0)));
    },
    [applyBoundaryAt, lyrics.length],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => {
      setIsPlaying(false);
      videoRef.current?.pause();
    };
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  }, [audioUrl]);

  const toggleLiveSync = () => {
    if (liveSyncMode) {
      setLiveSyncMode(false);
    } else {
      resetSync();
      setLiveSyncMode(true);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <FloatingButterflies />
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border bg-card shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-primary" />
          <h1 className="text-base sm:text-lg text-primary" style={{ fontFamily: "'Pacifico', cursive" }}>Pihu's Karaoke</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </Button>
          <MediaUpload type="audio" file={audioFile} onFileSelect={handleAudioFile} />
          <MediaUpload type="video" file={videoFile} onFileSelect={handleVideoFile} />
          <ExportButton
            videoUrl={videoUrl}
            audioUrl={audioUrl}
            lyrics={lyrics}
            duration={duration}
            lyricStyle={lyricStyle}
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Video preview area */}
        <div className="flex items-center justify-center p-2 sm:p-4 overflow-hidden shrink-0 lg:flex-1 h-[35vh] sm:h-[40vh] lg:h-full">
          <div className="h-full max-h-full lg:max-h-[calc(100vh-140px)] aspect-[9/16]">
            <VideoPreview
              videoUrl={videoUrl}
              currentTime={currentTime}
              isPlaying={isPlaying}
              lyrics={lyrics}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              videoRef={videoRef}
              lyricStyle={lyricStyle}
            />
          </div>
        </div>

        {/* Sidebar — full-width on mobile, fixed-width on desktop */}
        <div className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card shrink-0 flex flex-col overflow-hidden flex-1 lg:flex-none min-h-0">
          {/* Live Sync bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Mic className={`w-3.5 h-3.5 ${liveSyncMode ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">Live Sync</span>
            </div>
            <Button
              variant={liveSyncMode ? 'destructive' : 'outline'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={toggleLiveSync}
              disabled={lyrics.length === 0}
            >
              {liveSyncMode ? 'Stop' : 'Start'}
            </Button>
          </div>

          {liveSyncMode && (
            <div className="px-3 py-2 bg-primary/10 border-b border-primary/20">
              <p className="text-[10px] sm:text-xs text-primary mb-2">
                {syncComplete
                  ? '✓ All lines synced!'
                  : isSettingStart
                    ? 'Tap below (or press Space) → Set start of line 1'
                    : `Tap below (or press Space) → End of line ${currentSyncLine + 1} / Start of line ${currentSyncLine + 2}`}
              </p>
              {!syncComplete && (
                <Button
                  variant="default"
                  size="lg"
                  className="w-full h-14 sm:h-12 text-base sm:text-sm font-semibold gap-2 active:scale-95 transition-transform touch-manipulation select-none"
                  onClick={handleTap}
                >
                  <Hand className="w-5 h-5" />
                  TAP TO SYNC
                </Button>
              )}
            </div>
          )}

          {/* Persistent Lyrics / Style tabs */}
          <Tabs defaultValue="lyrics" className="flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-9 px-2 shrink-0">
              <TabsTrigger value="lyrics" className="text-xs h-7 data-[state=active]:bg-secondary">
                Lyrics
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs h-7 data-[state=active]:bg-secondary">
                Style
              </TabsTrigger>
            </TabsList>
            <TabsContent value="lyrics" className="flex-1 overflow-hidden mt-0 min-h-0">
              <LyricsEditor
                lyrics={lyrics}
                currentTime={currentTime}
                duration={duration}
                onLyricsChange={setLyrics}
                onSeek={handleSeek}
                autoChain={autoChain}
                onAutoChainChange={setAutoChain}
                liveSyncIndex={liveSyncMode ? currentSyncLine : -1}
              />
            </TabsContent>
            <TabsContent value="style" className="flex-1 overflow-auto mt-0 min-h-0">
              <LyricsStylePanel style={lyricStyle} onChange={setLyricStyle} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Timeline
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        lyrics={lyrics}
        markers={markers}
        markerTargetIndex={markerTargetIndex}
        onSeek={handleSeek}
        onTogglePlay={togglePlay}
        onDropMarker={handleDropMarker}
        onMarkerChange={handleMarkerChange}
      />
    </div>
  );
};

export default Index;
