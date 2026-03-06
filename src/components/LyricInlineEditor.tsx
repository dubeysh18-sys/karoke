import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LyricInlineEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const LyricInlineEditor: React.FC<LyricInlineEditorProps> = ({
  value,
  onValueChange,
  placeholder = 'Lyric text...',
  className,
  ...props
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;

    if (editor.innerText !== value) {
      editor.innerText = value;
    }
  }, [value]);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const nextText = (event.currentTarget.innerText || '').replace(/\r/g, '').replace(/\u00A0/g, ' ');
    onValueChange(nextText);
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
      onInput={handleInput}
      className={cn(
        'w-full rounded-sm px-1 py-0.5 text-sm outline-none whitespace-pre-wrap break-words',
        'focus-visible:ring-1 focus-visible:ring-ring',
        'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
};

export default LyricInlineEditor;
