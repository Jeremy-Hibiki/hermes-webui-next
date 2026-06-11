'use client';

import { useRef, useEffect } from 'react';
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

function useCodeBlockHeaders(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const codeBlocks = container.querySelectorAll('pre > code');
    codeBlocks.forEach((codeEl) => {
      const pre = codeEl.parentElement;
      if (!pre) return;

      // Skip if already processed
      if (pre.previousElementSibling?.classList.contains('pre-header')) return;
      if (pre.querySelector('.code-copy-btn')) return;

      // Extract language from className (e.g. "language-typescript")
      const langClass = Array.from(codeEl.classList).find((c) => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : '';

      // Create header
      const header = document.createElement('div');
      header.className = 'pre-header';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';

      const label = document.createElement('span');
      label.textContent = lang || 'code';
      header.appendChild(label);

      // Create copy button
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.type = 'button';
      btn.textContent = 'Copy';
      btn.onclick = () => {
        const text = codeEl.textContent || '';
        navigator.clipboard
          .writeText(text)
          .then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => (btn.textContent = 'Copy'), 1500);
          })
          .catch(() => {
            btn.textContent = 'Failed';
            setTimeout(() => (btn.textContent = 'Copy'), 1500);
          });
      };
      header.appendChild(btn);

      pre.parentElement?.insertBefore(header, pre);
    });
  });
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useCodeBlockHeaders(containerRef);

  return (
    <div ref={containerRef}>
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
    </div>
  );
}
