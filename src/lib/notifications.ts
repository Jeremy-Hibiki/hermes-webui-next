'use client';

let _soundEnabled = false;
let _notificationsEnabled = false;
const _attentionSoundSeenKeys = new Map<string, number>();

const _ATTENTION_COOLDOWN = 900;
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

function playTone(startFreq: number, endFreq: number, duration: number, volume = 0.3) {
  try {
    const ACtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ACtor) return;
    const ctx = new ACtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.setValueAtTime(endFreq, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
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
  // Prune old entries
  for (const [k, t] of _attentionSoundSeenKeys) {
    if (now - t > 300000) _attentionSoundSeenKeys.delete(k);
  }
  // Per-key dedup
  const lastTime = _attentionSoundSeenKeys.get(key);
  if (lastTime && now - lastTime < ATTENTION_DEDUP_MS) return;
  _attentionSoundSeenKeys.set(key, now);
  playTone(880, 660, 0.24);
}

export async function sendBrowserNotification(title: string, body: string) {
  if (!isNotificationsEnabled()) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
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
