import React from 'react';
import { Type, Move, Eye } from 'lucide-react';
import {
  LyricStyle,
  ANIMATION_OPTIONS,
  LyricAnimation,
  LyricPosition,
} from '@/types/editor';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LyricsStylePanelProps {
  style: LyricStyle;
  onChange: (style: LyricStyle) => void;
}

const LyricsStylePanel: React.FC<LyricsStylePanelProps> = ({ style, onChange }) => {
  const update = <K extends keyof LyricStyle>(key: K, value: LyricStyle[K]) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <div className="bg-card">
      <Tabs defaultValue="font" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-9 px-2">
          <TabsTrigger value="font" className="text-xs gap-1 h-7 data-[state=active]:bg-secondary">
            <Type className="w-3 h-3" /> Font
          </TabsTrigger>
          <TabsTrigger value="position" className="text-xs gap-1 h-7 data-[state=active]:bg-secondary">
            <Move className="w-3 h-3" /> Position
          </TabsTrigger>
          <TabsTrigger value="animation" className="text-xs gap-1 h-7 data-[state=active]:bg-secondary">
            <Eye className="w-3 h-3" /> Animation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="font" className="p-3 space-y-3 mt-0">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <span className="text-xs font-mono text-muted-foreground">{style.fontSize}px</span>
            </div>
            <Slider
              value={[style.fontSize]}
              min={16}
              max={64}
              step={1}
              onValueChange={([v]) => update('fontSize', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Lyrics Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.color}
                onChange={(e) => update('color', e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
              />
              <span className="text-xs font-mono text-muted-foreground">{style.color}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="position" className="p-3 space-y-3 mt-0">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preset Position</Label>
            <div className="flex gap-1">
              {(['top', 'upper', 'center', 'bottom'] as LyricPosition[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => update('position', pos)}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${
                    style.position === pos
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Vertical Position</Label>
              <span className="text-xs font-mono text-muted-foreground">{style.customY}%</span>
            </div>
            <Slider
              value={[style.customY]}
              min={10}
              max={95}
              step={1}
              onValueChange={([v]) => {
                onChange({ ...style, customY: v, position: 'custom' });
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="animation" className="p-3 space-y-3 mt-0">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Animation</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {ANIMATION_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => update('animation', a.value as LyricAnimation)}
                  className={`text-left p-2 rounded-md transition-colors ${
                    style.animation === a.value
                      ? 'bg-primary/20 border border-primary/40'
                      : 'bg-secondary border border-transparent hover:bg-secondary/80'
                  }`}
                >
                  <span className="text-xs font-medium text-foreground">{a.label}</span>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-foreground">Show Next Line</Label>
              <p className="text-[10px] text-muted-foreground">Preview upcoming lyrics</p>
            </div>
            <Switch
              checked={style.showNextLine}
              onCheckedChange={(v) => update('showNextLine', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Next Line Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.nextLineColor.startsWith('rgba') ? '#ffffff' : style.nextLineColor}
                onChange={(e) => update('nextLineColor', e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
              />
              <span className="text-xs font-mono text-muted-foreground">{style.nextLineColor}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LyricsStylePanel;
