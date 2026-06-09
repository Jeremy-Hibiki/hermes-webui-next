import { describe, it, expect } from "vite-plus/test";
import {
  getDateBucketLabel,
  getDateBucketBoundaries,
  bucketSessionsByDate,
} from "@/lib/date-buckets";
import type { Session } from "@/types";

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "s1",
  title: "Test",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  messages: [],
  model: null,
  provider: null,
  workspace: null,
  profile: "default",
  pinned: false,
  archived: false,
  project_id: null,
  message_count: 0,
  ...overrides,
});

// Reference time: Monday June 9, 2026 at noon UTC
const NOW_MS = new Date("2026-06-09T12:00:00Z").getTime(); // Monday

describe("getDateBucketBoundaries", () => {
  it("returns startOfWeek as a Monday", () => {
    const { startOfWeek } = getDateBucketBoundaries(NOW_MS);
    // Monday-based week: getDay() === 1 means Monday
    expect(startOfWeek.getDay()).toBe(1);
  });

  it("startOfLastWeek is exactly 7 days before startOfWeek", () => {
    const { startOfWeek, startOfLastWeek } = getDateBucketBoundaries(NOW_MS);
    const diff = startOfWeek.getTime() - startOfLastWeek.getTime();
    expect(diff).toBe(7 * 86400000);
  });

  it("returns boundaries where each is before the next", () => {
    const { startOfToday, startOfYesterday, startOfWeek, startOfLastWeek } =
      getDateBucketBoundaries(NOW_MS);

    expect(startOfToday.getTime()).toBeGreaterThan(startOfYesterday.getTime());
    expect(startOfYesterday.getTime()).toBeGreaterThanOrEqual(startOfWeek.getTime());
    expect(startOfWeek.getTime()).toBeGreaterThan(startOfLastWeek.getTime());
  });

  it("startOfToday is midnight of the same local day as nowMs", () => {
    const { startOfToday } = getDateBucketBoundaries(NOW_MS);
    const now = new Date(NOW_MS);
    expect(startOfToday.getFullYear()).toBe(now.getFullYear());
    expect(startOfToday.getMonth()).toBe(now.getMonth());
    expect(startOfToday.getDate()).toBe(now.getDate());
    expect(startOfToday.getHours()).toBe(0);
    expect(startOfToday.getMinutes()).toBe(0);
    expect(startOfToday.getSeconds()).toBe(0);
  });
});

describe("getDateBucketLabel", () => {
  it('returns "Today" for timestamps within today', () => {
    const todayMs = NOW_MS - 1000; // 1 second before now
    expect(getDateBucketLabel(todayMs, NOW_MS)).toBe("Today");
  });

  it('returns "Yesterday" for timestamps within yesterday', () => {
    const { startOfYesterday } = getDateBucketBoundaries(NOW_MS);
    const yesterdayMs = startOfYesterday.getTime() + 3600000; // 1 hour into yesterday
    expect(getDateBucketLabel(yesterdayMs, NOW_MS)).toBe("Yesterday");
  });

  it('returns "This week" for timestamps earlier this week but not yesterday or today', () => {
    // Sunday June 7 (still "this week" since week starts Monday)
    // But Sunday June 8 is yesterday for Monday June 9
    // Let's use Saturday June 6 (within this week: Mon June 8 - Sun June 14? No.
    // Week starts Monday: June 8 (Mon) to June 14 (Sun)
    // For Monday June 9, "this week" starts Monday June 8
    // Yesterday is Sunday June 8, so "this week" and "yesterday" overlap
    // For a Thursday-based week: Let's pick a day that's this week but NOT today/yesterday
    // Monday June 8 at midnight is startOfWeek. Any time from startOfWeek to startOfYesterday
    // For Monday June 9, startOfYesterday is Sunday June 8 midnight = startOfWeek
    // So there's no "this week but not yesterday" for a Monday
    // Let's test with a Wednesday reference instead
    const wednesdayMs = new Date("2026-06-10T12:00:00Z").getTime(); // Wednesday
    // Monday June 8 midnight is startOfWeek
    const mondayMorning = new Date("2026-06-08T01:00:00Z").getTime();
    expect(getDateBucketLabel(mondayMorning, wednesdayMs)).toBe("This week");
  });

  it('returns "Last week" for timestamps in the previous calendar week', () => {
    // For Monday June 9, last week starts Monday June 2
    const lastWeekMs = new Date("2026-06-04T12:00:00Z").getTime(); // Thursday June 4
    expect(getDateBucketLabel(lastWeekMs, NOW_MS)).toBe("Last week");
  });

  it('returns "Older" for timestamps before last week', () => {
    const olderMs = new Date("2026-05-20T12:00:00Z").getTime();
    expect(getDateBucketLabel(olderMs, NOW_MS)).toBe("Older");
  });

  it("uses current time if nowMs is not provided", () => {
    const label = getDateBucketLabel(Date.now() - 1000);
    expect(label).toBe("Today");
  });
});

describe("bucketSessionsByDate", () => {
  it("groups sessions into date buckets", () => {
    const sessions: Session[] = [
      makeSession({
        id: "today1",
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
      makeSession({
        id: "today2",
        updated_at: new Date(NOW_MS - 120000).toISOString(),
      }),
      makeSession({
        id: "yesterday1",
        updated_at: new Date(NOW_MS - 86400000).toISOString(),
      }),
      makeSession({
        id: "older1",
        updated_at: new Date(NOW_MS - 30 * 86400000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, NOW_MS);
    expect(buckets.length).toBeGreaterThan(0);

    const todayBucket = buckets.find((b) => b.label === "Today");
    expect(todayBucket).toBeDefined();
    expect(todayBucket!.sessions).toHaveLength(2);

    const olderBucket = buckets.find((b) => b.label === "Older");
    expect(olderBucket).toBeDefined();
    expect(olderBucket!.sessions).toHaveLength(1);
  });

  it("hides empty buckets", () => {
    const sessions: Session[] = [
      makeSession({
        id: "today1",
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, NOW_MS);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe("Today");
  });

  it("sorts sessions within each bucket by updated_at descending", () => {
    const sessions: Session[] = [
      makeSession({
        id: "older1",
        updated_at: new Date(NOW_MS - 20 * 86400000).toISOString(),
      }),
      makeSession({
        id: "today2",
        updated_at: new Date(NOW_MS - 120000).toISOString(),
      }),
      makeSession({
        id: "today1",
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, NOW_MS);
    const todayBucket = buckets.find((b) => b.label === "Today");
    expect(todayBucket!.sessions[0].id).toBe("today1");
    expect(todayBucket!.sessions[1].id).toBe("today2");
  });

  it("returns empty array for empty input", () => {
    const buckets = bucketSessionsByDate([], NOW_MS);
    expect(buckets).toHaveLength(0);
  });

  it("excludes pinned and archived sessions", () => {
    const sessions: Session[] = [
      makeSession({
        id: "pinned1",
        pinned: true,
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
      makeSession({
        id: "archived1",
        archived: true,
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
      makeSession({
        id: "normal1",
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, NOW_MS);
    const allIds = buckets.flatMap((b) => b.sessions.map((s) => s.id));
    expect(allIds).not.toContain("pinned1");
    expect(allIds).not.toContain("archived1");
    expect(allIds).toContain("normal1");
  });

  it("maintains canonical bucket order: Today, Yesterday, This week, Last week, Older", () => {
    const sessions: Session[] = [
      makeSession({
        id: "old",
        updated_at: new Date(NOW_MS - 30 * 86400000).toISOString(),
      }),
      makeSession({
        id: "today",
        updated_at: new Date(NOW_MS - 60000).toISOString(),
      }),
    ];

    const buckets = bucketSessionsByDate(sessions, NOW_MS);
    const labels = buckets.map((b) => b.label);
    // Only non-empty buckets appear, but their relative order should be canonical
    const canonicalOrder = ["Today", "Yesterday", "This week", "Last week", "Older"];
    const labelIndices = labels.map((l) => canonicalOrder.indexOf(l));
    for (let i = 1; i < labelIndices.length; i++) {
      expect(labelIndices[i]).toBeGreaterThan(labelIndices[i - 1]);
    }
  });
});
