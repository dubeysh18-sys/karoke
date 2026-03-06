import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { LyricLine, LyricStyle, DEFAULT_LYRIC_STYLE, LyricAnimation } from '@/types/editor';

interface VideoPreviewProps {
  videoUrl: string | null;
  currentTime: number;
  isPlaying: boolean;
  lyrics: LyricLine[];
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  lyricStyle?: LyricStyle;
}

const SCALE = 3; // 1080 / 360

/** Framer Motion variants for each animation type */
const getTransitionVariants = (animation: LyricAnimation): Variants => {
  switch (animation) {
    case 'slideUp':
      return {
        initial: { opacity: 0, y: 80 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -80 },
      };
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    case 'zoomIn':
      return {
        initial: { opacity: 0, scale: 0.5 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.3 },
      };
    case 'typewriter':
      return {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -30 },
      };
    case 'blur':
      return {
        initial: { opacity: 0, filter: 'blur(16px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(16px)' },
      };
    case 'none':
    default:
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
};

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  currentTime,
  lyrics,
  videoRef,
  lyricStyle = DEFAULT_LYRIC_STYLE,
}) => {
  const activeIndex = lyrics.findIndex(
    (line) => currentTime >= line.startTime && currentTime <= line.endTime,
  );

  const activeLyric = activeIndex >= 0 ? lyrics[activeIndex] : null;
  const nextLyric =
    activeIndex >= 0
      ? lyrics[activeIndex + 1]
      : lyrics.find((line) => line.startTime > currentTime) || null;

  const scaledFontSize = lyricStyle.fontSize * SCALE;

  // Track the height of the active lyric container for dynamic next-line positioning
  const activeLyricRef = useRef<HTMLDivElement>(null);
  const [activeLyricHeight, setActiveLyricHeight] = useState(scaledFontSize * 2);

  const measureActiveLyric = useCallback(() => {
    if (activeLyricRef.current) {
      const h = activeLyricRef.current.scrollHeight;
      if (h > 0) setActiveLyricHeight(h);
    }
  }, []);

  useEffect(() => {
    measureActiveLyric();
  }, [activeLyric?.id, activeLyric?.text, measureActiveLyric]);

  const positionStyle = useMemo(() => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
      padding: '0 48px',
    };

    switch (lyricStyle.position) {
      case 'top':
        return { ...base, top: '12%' };
      case 'upper':
        return { ...base, top: '28%' };
      case 'center':
        return { ...base, top: '45%' };
      case 'bottom':
        return { ...base, bottom: '10%' };
      case 'custom':
        return { ...base, top: `${lyricStyle.customY}%`, transform: 'translateY(-50%)' };
      default:
        return { ...base, bottom: '10%' };
    }
  }, [lyricStyle.position, lyricStyle.customY]);

  const baseShadow = '0 2px 8px rgba(0,0,0,0.82)';
  const transitionAnimation = lyricStyle.animation;

  const fontStyle: React.CSSProperties = {
    fontFamily: `'${lyricStyle.font}', system-ui, sans-serif`,
    fontSize: `${scaledFontSize}px`,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '0.02em',
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    display: 'inline-block',
    color: lyricStyle.color,
    textShadow: baseShadow,
  };

  const variants = getTransitionVariants(transitionAnimation);
  const motionTransition =
    transitionAnimation === 'none'
      ? { duration: 0 }
      : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <div className="relative w-full aspect-[9/16] bg-background rounded-lg overflow-hidden border border-border">
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          width: 1080,
          height: 1920,
          transform: 'scale(var(--preview-scale))',
        }}
        ref={(el) => {
          if (el) {
            const container = el.parentElement;
            if (container) {
              const scale = container.clientWidth / 1080;
              el.style.setProperty('--preview-scale', String(scale));
              const ro = new ResizeObserver(() => {
                el.style.setProperty('--preview-scale', String(container.clientWidth / 1080));
              });
              ro.observe(container);
            }
          }
        }}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground" style={{ fontSize: 28 }}>Upload a background video</p>
          </div>
        )}

        <div style={positionStyle}>
          {/* Active lyric */}
          <div
            ref={activeLyricRef}
            className="relative text-center w-full"
            style={{ minHeight: Math.max(80 * SCALE, scaledFontSize * 2) }}
          >
            <AnimatePresence mode="sync" initial={false}>
              {activeLyric && (
                <motion.div
                  key={activeLyric.id}
                  className="absolute inset-0 flex items-center justify-center"
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={motionTransition}
                  onAnimationComplete={measureActiveLyric}
                >
                  <p style={fontStyle}>{activeLyric.text}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Next line preview — positioned dynamically below active lyric */}
          {lyricStyle.showNextLine && (
            <div
              className="relative text-center w-full"
              style={{
                minHeight: Math.max(40 * SCALE, scaledFontSize * 0.9),
                marginTop: 24,
              }}
            >
              <AnimatePresence mode="sync" initial={false}>
                {nextLyric && (
                  <motion.p
                    key={nextLyric.id}
                    className="absolute inset-0 flex items-center justify-center"
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={motionTransition}
                    style={{
                      ...fontStyle,
                      fontSize: Math.max(22 * SCALE, scaledFontSize * 0.65),
                      fontWeight: 400,
                      color: lyricStyle.nextLineColor,
                      textShadow: '0 1px 4px rgba(0,0,0,0.75)',
                    }}
                  >
                    {nextLyric.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="absolute top-40 right-40 px-16 py-4 rounded bg-background/60 backdrop-blur-sm">
          <span className="font-mono text-muted-foreground" style={{ fontSize: 20 }}>9:16 Reel</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
