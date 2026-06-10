export function formatRelativeTime(raw: string | number | undefined): string {
  if (raw == null) return '';
  const ms = toMs(raw);
  if (!Number.isFinite(ms)) return '';

  const now = Date.now();
  const diffMs = now - ms;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toMs(raw: string | number): number {
  if (typeof raw === 'number') return raw > 1e12 ? raw : raw * 1000;
  const parsed = new Date(raw).getTime();
  if (Number.isFinite(parsed)) return parsed;
  const num = parseFloat(raw);
  if (Number.isFinite(num)) return num > 1e12 ? num : num * 1000;
  return NaN;
}
