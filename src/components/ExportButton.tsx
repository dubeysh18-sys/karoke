import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LyricLine, LyricStyle, DEFAULT_LYRIC_STYLE } from '@/types/editor';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { toast } from 'sonner';

interface ExportButtonProps {
  videoUrl: string | null;
  audioUrl: string | null;
  lyrics: LyricLine[];
  duration: number;
  lyricStyle?: LyricStyle;
}

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const TRANSITION_DURATION = 0.35;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const ExportButton: React.FC<ExportButtonProps> = ({
  videoUrl,
  audioUrl,
  lyrics,
  duration,
  lyricStyle = DEFAULT_LYRIC_STYLE,
}) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const canExport = videoUrl && audioUrl && lyrics.length > 0;

  const drawMultilineText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fillStyle: string,
    shadowColor: string,
    shadowBlur: number,
    alpha = 1,
  ) => {
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.3;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    const previousAlpha = ctx.globalAlpha;

    ctx.fillStyle = fillStyle;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.globalAlpha = previousAlpha * alpha;

    lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + index * lineHeight);
    });

    ctx.globalAlpha = previousAlpha;
    ctx.shadowBlur = 0;
  };

  /** Get the total rendered height of multiline text */
  const getMultilineHeight = (text: string, fontSize: number) => {
    const lines = text.split('\n');
    return lines.length * fontSize * 1.3;
  };

  const renderLyricsOnCanvas = (
    ctx: CanvasRenderingContext2D,
    frameTime: number,
  ) => {
    const activeIndex = lyrics.findIndex(
      (l) => frameTime >= l.startTime && frameTime <= l.endTime,
    );
    const activeLyric = activeIndex >= 0 ? lyrics[activeIndex] : null;
    if (!activeLyric) return;

    const fontFamily = `'${lyricStyle.font}', system-ui, sans-serif`;
    const exportFontSize = Math.round(lyricStyle.fontSize * (WIDTH / 360));
    ctx.font = `bold ${exportFontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = WIDTH / 2;
    let y: number;
    switch (lyricStyle.position) {
      case 'top': y = HEIGHT * 0.12; break;
      case 'upper': y = HEIGHT * 0.28; break;
      case 'center': y = HEIGHT * 0.45; break;
      case 'custom': y = HEIGHT * (lyricStyle.customY / 100); break;
      default: y = HEIGHT * 0.85;
    }

    // Entry/exit transition calculations
    const entryProgress = Math.min(1, (frameTime - activeLyric.startTime) / TRANSITION_DURATION);
    const exitProgress = Math.max(0, (activeLyric.endTime - frameTime) / TRANSITION_DURATION);
    const entryEased = easeOut(entryProgress);
    const exitEased = easeOut(Math.min(1, exitProgress));
    const shouldAnimateTransition = lyricStyle.animation !== 'none';
    const transitionAlpha = shouldAnimateTransition ? Math.min(entryEased, exitEased) : 1;

    ctx.save();

    const animation = lyricStyle.animation;
    if (animation === 'slideUp') {
      const slideOffset = (1 - entryEased) * 80;
      const exitOffset = exitProgress < 1 ? (1 - exitEased) * -80 : 0;
      ctx.globalAlpha = transitionAlpha;
      y += slideOffset + exitOffset;
    } else if (animation === 'fade') {
      ctx.globalAlpha = transitionAlpha;
    } else if (animation === 'zoomIn') {
      const scale = 0.5 + entryEased * 0.5;
      ctx.globalAlpha = transitionAlpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    } else if (animation === 'blur') {
      ctx.globalAlpha = transitionAlpha;
    } else if (animation === 'typewriter') {
      ctx.globalAlpha = transitionAlpha;
    } else {
      ctx.globalAlpha = 1;
    }

    // Render active lyric text (solid color, no highlighting)
    drawMultilineText(
      ctx,
      activeLyric.text,
      x,
      y,
      exportFontSize,
      lyricStyle.color,
      'rgba(0,0,0,0.82)',
      8,
    );

    ctx.restore();

    // Next line preview — positioned below active lyric based on its height
    if (lyricStyle.showNextLine) {
      const nextLyric = activeIndex >= 0 ? lyrics[activeIndex + 1] : null;
      if (nextLyric) {
        const activeHeight = getMultilineHeight(activeLyric.text, exportFontSize);
        const nextFontSize = Math.round(exportFontSize * 0.65);
        ctx.font = `400 ${nextFontSize}px ${fontFamily}`;
        const nextY = y + activeHeight / 2 + nextFontSize * 0.8;
        drawMultilineText(
          ctx,
          nextLyric.text,
          x,
          nextY,
          nextFontSize,
          lyricStyle.nextLineColor,
          'rgba(0,0,0,0.5)',
          4,
          transitionAlpha,
        );
      }
    }
  };

  const handleExport = async () => {
    if (!videoUrl || !audioUrl) return;

    if (typeof VideoEncoder === 'undefined') {
      toast.error('MP4 export requires Chrome or Edge. Please switch browsers.');
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const ctx = canvas.getContext('2d')!;

      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
        video.load();
      });

      const audioResponse = await fetch(audioUrl);
      const arrayBuffer = await audioResponse.arrayBuffer();
      const offlineCtx = new OfflineAudioContext(2, 1, 44100);
      const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

      const totalDuration = audioBuffer.duration || duration;
      const totalFrames = Math.ceil(totalDuration * FPS);
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;

      const muxerTarget = new ArrayBufferTarget();
      const muxer = new Muxer({
        target: muxerTarget,
        video: { codec: 'avc', width: WIDTH, height: HEIGHT },
        audio: { codec: 'aac', numberOfChannels, sampleRate },
        fastStart: 'in-memory',
      });

      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error('VideoEncoder error:', e),
      });
      videoEncoder.configure({
        codec: 'avc1.640028',
        width: WIDTH,
        height: HEIGHT,
        bitrate: 8_000_000,
        framerate: FPS,
      });

      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error('AudioEncoder error:', e),
      });
      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels,
        sampleRate,
        bitrate: 128_000,
      });

      for (let frame = 0; frame < totalFrames; frame++) {
        const frameTime = frame / FPS;
        setProgress(Math.round((frame / totalFrames) * 85));

        video.currentTime = frameTime;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });

        ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
        renderLyricsOnCanvas(ctx, frameTime);

        const videoFrame = new VideoFrame(canvas, {
          timestamp: frame * (1_000_000 / FPS),
          duration: 1_000_000 / FPS,
        });

        const keyFrame = frame % (FPS * 2) === 0;
        videoEncoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        if (frame % 10 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setProgress(88);
      const audioChunkSize = sampleRate;
      const totalSamples = audioBuffer.length;

      for (let offset = 0; offset < totalSamples; offset += audioChunkSize) {
        const remaining = Math.min(audioChunkSize, totalSamples - offset);
        const planar = new Float32Array(remaining * numberOfChannels);
        for (let ch = 0; ch < numberOfChannels; ch++) {
          const channelData = audioBuffer.getChannelData(ch);
          planar.set(channelData.subarray(offset, offset + remaining), ch * remaining);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: remaining,
          numberOfChannels,
          timestamp: (offset / sampleRate) * 1_000_000,
          data: planar,
        });

        audioEncoder.encode(audioData);
        audioData.close();
      }

      setProgress(92);
      await videoEncoder.flush();
      await audioEncoder.flush();
      videoEncoder.close();
      audioEncoder.close();

      setProgress(96);
      muxer.finalize();

      const blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'karaoke-reel.mp4';
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success('MP4 exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(`Export failed: ${(err as Error).message}`);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={!canExport || exporting}
      size="sm"
      className="gap-2"
    >
      {exporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-mono text-xs">{progress}%</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export MP4
        </>
      )}
    </Button>
  );
};

export default ExportButton;
