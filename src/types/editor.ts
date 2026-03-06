export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export type LyricFont = 'Inter' | 'Bebas Neue' | 'Pacifico' | 'Oswald' | 'Permanent Marker' | 'Playfair Display';
export type LyricAnimation = 'none' | 'slideUp' | 'fade' | 'zoomIn' | 'typewriter' | 'blur';
export type LyricPosition = 'bottom' | 'center' | 'upper' | 'top' | 'custom';

export interface LyricStyle {
  font: LyricFont;
  fontSize: number; // 16-64
  position: LyricPosition;
  customY: number; // 0-100 percent from top
  customX: number; // 0-100 percent from left (50 = centered)
  animation: LyricAnimation;
  showNextLine: boolean;
  color: string; // lyrics color
  nextLineColor: string; // next line color
}

export const DEFAULT_LYRIC_STYLE: LyricStyle = {
  font: 'Inter',
  fontSize: 28,
  position: 'bottom',
  customY: 80,
  customX: 50,
  animation: 'slideUp',
  showNextLine: true,
  color: '#ffffff',
  nextLineColor: 'rgba(255,255,255,0.4)',
};

export const FONT_OPTIONS: { value: LyricFont; label: string }[] = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Pacifico', label: 'Pacifico' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Permanent Marker', label: 'Marker' },
  { value: 'Playfair Display', label: 'Playfair' },
];

export const ANIMATION_OPTIONS: { value: LyricAnimation; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Static text, no effects' },
  { value: 'slideUp', label: 'Slide Up', desc: 'Slide in from below' },
  { value: 'fade', label: 'Fade', desc: 'Smooth fade in/out' },
  { value: 'zoomIn', label: 'Zoom In', desc: 'Scale up on entry' },
  { value: 'typewriter', label: 'Typewriter', desc: 'Character by character' },
  { value: 'blur', label: 'Blur', desc: 'Blur to sharp reveal' },
];

export interface EditorState {
  audioFile: File | null;
  audioUrl: string | null;
  videoFile: File | null;
  videoUrl: string | null;
  lyrics: LyricLine[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  lyricStyle: LyricStyle;
}

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const [mins, rest] = parts;
  const [secs, ms] = (rest || '0').split('.');
  return parseInt(mins) * 60 + parseInt(secs) + (parseInt(ms || '0') / 100);
};

export const generateId = () => Math.random().toString(36).substring(2, 9);
