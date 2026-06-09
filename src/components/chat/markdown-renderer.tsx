'use client';

import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { mermaid } from '@streamdown/mermaid';
import { math } from '@streamdown/math';
import { cjk } from '@streamdown/cjk';
import 'katex/dist/katex.min.css';

const plugins = { code, mermaid, math, cjk };

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <Streamdown
      plugins={plugins}
      caret="block"
      isAnimating={isStreaming ?? false}
      controls={true}
      linkSafety={{ enabled: true }}
      shikiTheme={['github-light', 'github-dark']}
    >
      {content}
    </Streamdown>
  );
}
