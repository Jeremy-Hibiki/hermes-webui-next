import { describe, it, expect } from 'vite-plus/test';
import type { Session, Project } from '@/types';
import { bucketSessionsByDate } from '@/lib/date-buckets';

// Test the grouping/filtering logic extracted from useSessions
// The actual SWR integration is tested via SessionList component tests

function computeSessionGroups(sessions: Session[], projects: Project[]) {
  const activeSessions = sessions.filter((s) => !s.archived);
  const pinnedSessions = sessions.filter((s) => s.pinned && !s.archived);

  const groups: Record<string, Session[]> = {};
  const ungrouped: Session[] = [];

  for (const session of activeSessions) {
    if (session.pinned) continue;
    if (session.project_id) {
      if (!groups[session.project_id]) groups[session.project_id] = [];
      groups[session.project_id].push(session);
    } else {
      ungrouped.push(session);
    }
  }

  const result: { projectId: string | null; name: string; color: string; sessions: Session[] }[] = projects
    .filter((p) => groups[p.id]?.length)
    .map((p) => ({ projectId: p.id, name: p.name, color: p.color, sessions: groups[p.id] }));

  if (ungrouped.length > 0) {
    result.push({ projectId: null, name: '', color: '', sessions: ungrouped });
  }

  return { activeSessions, pinnedSessions, groupedSessions: result };
}

describe('Session grouping logic', () => {
  const projects: Project[] = [
    { id: 'p1', name: 'Project A', color: '#FF0000' },
    { id: 'p2', name: 'Project B', color: '#00FF00' },
  ];

  const sessions: Session[] = [
    {
      id: 's1',
      title: 'Pinned',
      created_at: '',
      updated_at: '',
      messages: [],
      model: null,
      provider: null,
      workspace: null,
      profile: 'default',
      pinned: true,
      archived: false,
      project_id: null,
      message_count: 0,
    },
    {
      id: 's2',
      title: 'In Project A',
      created_at: '',
      updated_at: '',
      messages: [],
      model: null,
      provider: null,
      workspace: null,
      profile: 'default',
      pinned: false,
      archived: false,
      project_id: 'p1',
      message_count: 3,
    },
    {
      id: 's3',
      title: 'Ungrouped',
      created_at: '',
      updated_at: '',
      messages: [],
      model: null,
      provider: null,
      workspace: null,
      profile: 'default',
      pinned: false,
      archived: false,
      project_id: null,
      message_count: 1,
    },
    {
      id: 's4',
      title: 'Archived',
      created_at: '',
      updated_at: '',
      messages: [],
      model: null,
      provider: null,
      workspace: null,
      profile: 'default',
      pinned: false,
      archived: true,
      project_id: null,
      message_count: 0,
    },
  ];

  it('filters out archived sessions', () => {
    const { activeSessions } = computeSessionGroups(sessions, projects);
    expect(activeSessions).toHaveLength(3);
    expect(activeSessions.every((s) => !s.archived)).toBe(true);
  });

  it('extracts pinned sessions', () => {
    const { pinnedSessions } = computeSessionGroups(sessions, projects);
    expect(pinnedSessions).toHaveLength(1);
    expect(pinnedSessions[0].id).toBe('s1');
  });

  it('groups sessions by project', () => {
    const { groupedSessions } = computeSessionGroups(sessions, projects);
    const projectGroup = groupedSessions.find((g) => g.projectId === 'p1');
    expect(projectGroup).toBeDefined();
    expect(projectGroup!.sessions).toHaveLength(1);
    expect(projectGroup!.name).toBe('Project A');
  });

  it('puts ungrouped sessions at the end', () => {
    const { groupedSessions } = computeSessionGroups(sessions, projects);
    const last = groupedSessions[groupedSessions.length - 1];
    expect(last.projectId).toBeNull();
    expect(last.sessions).toHaveLength(1);
    expect(last.sessions[0].id).toBe('s3');
  });

  it('handles empty sessions', () => {
    const { activeSessions, pinnedSessions } = computeSessionGroups([], projects);
    expect(activeSessions).toHaveLength(0);
    expect(pinnedSessions).toHaveLength(0);
  });
});

describe('dateGroupedSessions from bucketSessionsByDate', () => {
  const nowMs = new Date('2026-06-09T12:00:00Z').getTime();

  it('buckets active non-pinned sessions by date', () => {
    const sessions: Session[] = [
      {
        id: 'today',
        title: 'Today',
        created_at: new Date(nowMs - 60000).toISOString(),
        updated_at: new Date(nowMs - 60000).toISOString(),
        messages: [],
        model: null,
        provider: null,
        workspace: null,
        profile: 'default',
        pinned: false,
        archived: false,
        project_id: null,
        message_count: 0,
      },
      {
        id: 'pinned',
        title: 'Pinned',
        created_at: new Date(nowMs - 60000).toISOString(),
        updated_at: new Date(nowMs - 60000).toISOString(),
        messages: [],
        model: null,
        provider: null,
        workspace: null,
        profile: 'default',
        pinned: true,
        archived: false,
        project_id: null,
        message_count: 0,
      },
    ];

    const activeSessions = sessions.filter((s) => !s.archived);
    const buckets = bucketSessionsByDate(activeSessions, nowMs);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('Today');
    expect(buckets[0].sessions).toHaveLength(1);
    expect(buckets[0].sessions[0].id).toBe('today');
  });
});
