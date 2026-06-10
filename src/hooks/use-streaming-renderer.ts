'use client';

import { useRef, useCallback } from 'react';

/**
 * Streaming word-fade renderer.
 * Each token appends to a buffer. A rAF loop reveals words progressively
 * with staggered CSS fade animations, matching the original's _streamFade* system.
 *
 * Usage: call `appendToken(text)` on each SSE token event.
 * Call `getDisplay()` to get current HTML for rendering.
 * Call `drain()` when stream ends to reveal remaining words.
 * Call `reset()` when starting a new stream.
 */

const BASE_FADE_MS = 200;
const MAX_FADE_MS = 350;
const STAGGER_MS = 16;
const FRAME_MS = 33;
const DRAIN_TIMEOUT = 900;

function pauseAfter(ch: string): number {
  if (ch === '\n') return 90;
  if ('.!?'.includes(ch)) return 45;
  if (ch === ':') return 30;
  return 0;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface State {
  fullText: string;
  visibleLen: number;
  startedAt: number;
  lastArrival: number;
  arrivalWps: number;
  fadeMs: number;
  staggerOffset: number;
  holdUntil: number;
  raf: number | null;
  html: string;
  draining: boolean;
  onHtml: ((html: string) => void) | null;
}

export function useStreamingRenderer() {
  const s = useRef<State>({
    fullText: '',
    visibleLen: 0,
    startedAt: 0,
    lastArrival: 0,
    arrivalWps: 0,
    fadeMs: BASE_FADE_MS,
    staggerOffset: 0,
    holdUntil: 0,
    raf: null,
    html: '',
    draining: false,
    onHtml: null,
  });

  const buildHtml = useCallback((text: string, fromIdx: number, prevOffset: number) => {
    // Only render words after fromIdx
    const slice = text.slice(fromIdx);
    if (!slice) return { html: '', newOffset: prevOffset };

    let out = '';
    let offset = prevOffset;
    let match: RegExpExecArray | null;
    const re = /(\S+)(\s*)/g;
    while ((match = re.exec(slice)) !== null) {
      const delay = offset;
      offset += STAGGER_MS;
      out += `<span class="stream-fade-word is-new" style="animation-delay:${delay}ms;--stream-fade-ms:${s.current.fadeMs}ms">${escHtml(match[1])}</span>${match[2]}`;
    }
    return { html: out, newOffset: offset };
  }, []);

  const tick = useCallback(() => {
    const st = s.current;
    if (st.draining) return;

    const now = Date.now();
    if (now < st.holdUntil) {
      st.raf = requestAnimationFrame(tick);
      return;
    }

    const fullWords = st.fullText.match(/\S+/g) || [];
    const visibleText = st.fullText.slice(0, st.visibleLen);
    const visibleWords = visibleText.match(/\S+/g) || [];

    if (visibleWords.length >= fullWords.length) {
      st.raf = null;
      return;
    }

    // Compute reveal budget
    const age = Math.max(0, (now - st.startedAt) / 1000);
    const baseWps = Math.min(22 + age * 2.5, 60);
    const arrWps = Math.min(st.arrivalWps, 160);
    const backlog = fullWords.length - visibleWords.length;
    const backlogWps = backlog > 10 ? backlog * 3 : 0;
    const wps = Math.max(baseWps, arrWps * 0.5, backlogWps);
    const budget = Math.min(Math.max(1, Math.round((wps * FRAME_MS) / 1000)), 3);

    // Reveal words
    let newLen = st.visibleLen;
    let lastCh = '';
    const remain = st.fullText.slice(st.visibleLen);
    const re = /(\S+)(\s*)/g;
    for (let i = 0; i < budget; i++) {
      const m = re.exec(remain);
      if (!m) break;
      newLen += m[0].length;
      lastCh = m[1][m[1].length - 1] || '';
    }

    if (newLen === st.visibleLen) {
      st.raf = null;
      return;
    }

    st.visibleLen = newLen;

    const { html: newHtml, newOffset } = buildHtml(st.fullText, 0, 0);
    st.staggerOffset = newOffset;
    st.html = newHtml;

    if (st.onHtml) st.onHtml(st.html);

    // Pause after punctuation
    const pause = pauseAfter(lastCh);
    if (pause > 0) st.holdUntil = now + pause;

    // Adapt fade duration
    st.fadeMs = st.arrivalWps > 30 ? Math.min(BASE_FADE_MS * 0.6, MAX_FADE_MS) : BASE_FADE_MS;

    // Check if more to reveal
    const visible2 = st.fullText.slice(0, st.visibleLen).match(/\S+/g) || [];
    if (visible2.length < fullWords.length) {
      st.raf = requestAnimationFrame(tick);
    } else {
      st.raf = null;
    }
  }, [buildHtml]);

  const appendToken = useCallback(
    (text: string, onHtml: (html: string) => void) => {
      const st = s.current;
      st.onHtml = onHtml;
      st.fullText += text;

      const now = Date.now();
      const dt = (now - (st.lastArrival || now)) / 1000;
      if (dt > 0) {
        const newWords = (text.match(/\S+/g) || []).length;
        if (newWords > 0) {
          const instantWps = newWords / dt;
          st.arrivalWps = st.arrivalWps * 0.65 + instantWps * 0.35;
        }
      }
      st.lastArrival = now;

      if (!st.raf && !st.draining) {
        st.raf = requestAnimationFrame(tick);
      }
    },
    [tick],
  );

  const drain = useCallback((onHtml: (html: string) => void) => {
    const st = s.current;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.draining = true;
    st.onHtml = onHtml;

    const deadline = Date.now() + DRAIN_TIMEOUT;

    function drainTick() {
      const fullWords = st.fullText.match(/\S+/g) || [];
      const visibleWords = st.fullText.slice(0, st.visibleLen).match(/\S+/g) || [];

      if (visibleWords.length >= fullWords.length || Date.now() > deadline) {
        st.visibleLen = st.fullText.length;
        st.html = escHtml(st.fullText);
        st.draining = false;
        onHtml(st.html);
        return;
      }

      const reveal = Math.min(5, fullWords.length - visibleWords.length);
      const remain = st.fullText.slice(st.visibleLen);
      const re = /(\S+)(\s*)/g;
      let added = 0;
      let m: RegExpExecArray | null;
      while (added < reveal && (m = re.exec(remain)) !== null) {
        st.visibleLen += m[0].length;
        added++;
      }

      st.html = escHtml(st.fullText);
      onHtml(st.html);
      setTimeout(drainTick, 16);
    }

    drainTick();
  }, []);

  const reset = useCallback(() => {
    const st = s.current;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.fullText = '';
    st.visibleLen = 0;
    st.startedAt = Date.now();
    st.lastArrival = 0;
    st.arrivalWps = 0;
    st.fadeMs = BASE_FADE_MS;
    st.staggerOffset = 0;
    st.holdUntil = 0;
    st.raf = null;
    st.html = '';
    st.draining = false;
    st.onHtml = null;
  }, []);

  const getHtml = useCallback(() => s.current.html, []);
  const getFullText = useCallback(() => s.current.fullText, []);

  return { appendToken, drain, reset, getHtml, getFullText };
}
