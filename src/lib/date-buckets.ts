import type { Session } from "@/types";

export interface DateBucket {
  label: string;
  sessions: Session[];
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "Last week", "Older"] as const;
type BucketLabel = (typeof BUCKET_ORDER)[number];

function sessionTimestampMs(session: Session): number {
  const raw = session.last_message_at || session.updated_at || session.created_at || "";
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function getDateBucketBoundaries(nowMs: number = Date.now()) {
  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  return { startOfToday, startOfYesterday, startOfWeek, startOfLastWeek };
}

export function getDateBucketLabel(timestampMs: number, nowMs: number = Date.now()): BucketLabel {
  const { startOfToday, startOfYesterday, startOfWeek, startOfLastWeek } =
    getDateBucketBoundaries(nowMs);

  if (timestampMs >= startOfToday.getTime()) return "Today";
  if (timestampMs >= startOfYesterday.getTime()) return "Yesterday";
  if (timestampMs >= startOfWeek.getTime()) return "This week";
  if (timestampMs >= startOfLastWeek.getTime()) return "Last week";
  return "Older";
}

export function bucketSessionsByDate(
  sessions: Session[],
  nowMs: number = Date.now(),
): DateBucket[] {
  const eligible = sessions.filter((s) => !s.pinned && !s.archived);

  const buckets = new Map<BucketLabel, Session[]>();
  for (const label of BUCKET_ORDER) {
    buckets.set(label, []);
  }

  for (const session of eligible) {
    const ts = sessionTimestampMs(session);
    const label = getDateBucketLabel(ts, nowMs);
    buckets.get(label)!.push(session);
  }

  // Sort each bucket by updated_at descending
  for (const sessions of buckets.values()) {
    sessions.sort((a, b) => {
      const aMs = sessionTimestampMs(a);
      const bMs = sessionTimestampMs(b);
      return bMs - aMs;
    });
  }

  // Return only non-empty buckets in canonical order
  const result: DateBucket[] = [];
  for (const label of BUCKET_ORDER) {
    const sessions = buckets.get(label)!;
    if (sessions.length > 0) {
      result.push({ label, sessions });
    }
  }

  return result;
}
