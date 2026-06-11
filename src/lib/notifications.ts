'use client';

let _soundEnabled = false;
let _notificationsEnabled = false;
let _lastAttentionKey = '';
let _lastAttentionTime = 0;

const ATTENTION_COOLDOWN = 900;
const ATTENTION_DEDUP_MS = 5 * 60 * 1000;

export function setSoundEnabled(enabled: boolean) {
  _soundEnabled = enabled;
  try {
    localStorage.setItem('hermes-sound-enabled', String(enabled));
  } catch {}
}

export function setNotificationsEnabled(enabled: boolean) {
  _notificationsEnabled = enabled;
  try {
    localStorage.setItem('hermes-notifications-enabled', String(enabled));
  } catch {}
}

export function isSoundEnabled(): boolean {
  if (!_soundEnabled) {
    try {
      _soundEnabled = localStorage.getItem('hermes-sound-enabled') === 'true';
    } catch {}
  }
  return _soundEnabled;
}

export function isNotificationsEnabled(): boolean {
  if (!_notificationsEnabled) {
    try {
      _notificationsEnabled = localStorage.getItem('hermes-notifications-enabled') === 'true';
    } catch {}
  }
  return _notificationsEnabled;
}

function playTone(startFreq: number, endFreq: number, duration: number, volume = 0.15) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

/** Ascending two-tone for completion */
export function playNotificationSound() {
  if (!isSoundEnabled()) return;
  playTone(660, 880, 0.3);
}

/** Descending tone for approval/clarify attention */
export function playAttentionSound(key: string) {
  if (!isSoundEnabled()) return;
  const now = Date.now();
  // Global cooldown
  if (now - _lastAttentionTime < ATTENTION_COOLDOWN) return;
  // Per-key dedup
  if (key === _lastAttentionKey && now - _lastAttentionTime < ATTENTION_DEDUP_MS) return;
  _lastAttentionKey = key;
  _lastAttentionTime = now;
  playTone(880, 660, 0.24);
}

export async function sendBrowserNotification(title: string, body: string) {
  if (!isNotificationsEnabled()) return;
  if (!document.hidden) return;
  try {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {}
}
