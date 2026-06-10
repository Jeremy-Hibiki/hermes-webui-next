'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { User, Plus, Trash2, Check, Wifi, WifiOff, HelpCircle, EyeOff, Eye, Star, Pencil, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAtom } from 'jotai';
import { activeProfileAtom, defaultModelAtom } from '@/atoms/settings';
import { activeSessionAtom, sessionsListAtom } from '@/atoms/session';
import { busyAtom } from '@/atoms/chat';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/lib/i18n';

interface ProfileEntry {
  name: string;
  model?: string;
  provider?: string;
  base_url?: string;
  has_env?: boolean;
  total_skills?: number;
  enabled_skills?: number;
  gateway_running?: boolean;
  is_default?: boolean;
  default_workspace?: string;
  visible?: boolean;
}

interface ProfilesResponse {
  profiles: ProfileEntry[];
  active: string;
}

interface ModelGroupEntry {
  id: string;
  label?: string;
}

interface ModelGroup {
  provider: string;
  provider_id?: string;
  models: ModelGroupEntry[];
}

interface ModelsResponse {
  active_provider?: string;
  default_model?: string;
  groups: ModelGroup[];
  /** Back-compat: some earlier API shapes return a flat models array. */
  models?: { id: string; name: string; provider: string }[];
}

/** Name validation: lowercase letters, numbers, hyphens, underscores. Must start with alphanumeric. */
const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function ProfilePanel() {
  const {
    data,
    mutate: mutateProfiles,
    isLoading: profilesLoading,
  } = useSWR<ProfilesResponse>('/profiles', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: modelsData } = useSWR<ModelsResponse>('/models', fetcher, {
    revalidateOnFocus: false,
  });
  const [, setActiveProfile] = useAtom(activeProfileAtom);
  const [, setDefaultModel] = useAtom(defaultModelAtom);
  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);
  const [, setSessions] = useAtom(sessionsListAtom);
  const [busy] = useAtom(busyAtom);
  const { toast } = useToast();
  const { t: t18n } = useTranslation();

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [showConceptHelp, setShowConceptHelp] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    name: '',
    clone: false,
    model: '',
    provider: '',
    base_url: '',
    api_key: '',
  });
  const [formError, setFormError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const profiles = data?.profiles ?? [];
  const active = data?.active ?? 'default';
  const selected = profiles.find((p) => p.name === selectedProfile);

  // Build model groups for the create form select. Supports both the grouped
  // API shape (`groups`) and the legacy flat shape (`models`).
  const modelGroups = useMemo(() => {
    if (modelsData?.groups && modelsData.groups.length > 0) {
      return modelsData.groups;
    }
    // Fallback: synthesize groups from flat models array.
    if (modelsData?.models && modelsData.models.length > 0) {
      const map: Record<string, ModelGroup> = {};
      for (const m of modelsData.models) {
        const prov = m.provider || 'Other';
        if (!map[prov]) map[prov] = { provider: prov, models: [] };
        map[prov].models.push({ id: m.id, label: m.name || m.id });
      }
      return Object.values(map);
    }
    return [];
  }, [modelsData]);

  // Build a lookup: model-id -> provider-id, for auto-populating provider.
  const modelProviderLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const g of modelGroups) {
      const pid = g.provider_id || g.provider;
      for (const m of g.models) {
        lookup[m.id] = pid;
      }
    }
    return lookup;
  }, [modelGroups]);

  const handleSwitch = useCallback(
    async (name: string) => {
      try {
        const res = await apiPost<{
          active: string;
          default_model?: string;
          default_model_provider?: string;
          default_workspace?: string;
        }>('/profile/switch', { name });
        setActiveProfile(res.active);
        if (res.default_model) setDefaultModel(res.default_model);

        // If a session is in progress, create a new session for the new profile
        if (busy && activeSession) {
          try {
            const newSessionRes = await apiPost<{ session: { session_id: string; title: string } }>('/session/new', {
              profile: res.active,
            });
            const newSession = newSessionRes.session ?? newSessionRes;
            setActiveSession({
              ...activeSession,
              session_id: newSession.session_id,
              title: newSession.title ?? activeSession?.title,
              profile: res.active,
            });
          } catch {
            // If new session creation fails, just continue with profile switch
          }
        }

        // Refresh sessions list for sidebar
        try {
          const sessionsRes = await fetcher<{ sessions: import('@/types').Session[] }>('/sessions');
          setSessions(sessionsRes.sessions ?? []);
        } catch {
          // Sidebar refresh is best-effort
        }

        void mutateProfiles();
        toast(`Switched to ${name}`, 'success');
      } catch (err) {
        toast(`Switch failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }
    },
    [mutateProfiles, setActiveProfile, setDefaultModel, busy, activeSession, setActiveSession, setSessions, toast],
  );

  const handleSetDefault = useCallback(
    async (_name: string) => {
      // Backend has no /profile/set-default endpoint.
      toast('Setting a default profile is not supported by the backend.', 'info');
    },
    [toast],
  );

  const handleToggleVisibility = useCallback(
    async (_name: string, _visible: boolean) => {
      // Backend has no /profile/set-visibility endpoint.
      toast('Profile visibility toggle is not supported by the backend.', 'info');
    },
    [toast],
  );

  const handleRename = useCallback(async () => {
    // Backend has no /profile/rename endpoint.
    toast('Profile rename is not supported by the backend.', 'info');
    setRenaming(false);
  }, [toast]);

  /** Validate and create a new profile. Returns detailed error hints. */
  const handleCreate = useCallback(async () => {
    const name = createDraft.name.trim();
    setFormError('');

    if (!name) {
      setFormError('Name is required.');
      return;
    }
    if (!NAME_RE.test(name)) {
      setFormError('Lowercase letters, numbers, hyphens, underscores only. Must start with a letter or number.');
      return;
    }
    const baseUrl = createDraft.base_url.trim();
    if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
      setFormError('Base URL must start with http:// or https://.');
      return;
    }

    try {
      await apiPost('/profile/create', {
        name,
        clone_config: createDraft.clone ? active : undefined,
        default_model: createDraft.model || undefined,
        model_provider: createDraft.provider || undefined,
        base_url: baseUrl || undefined,
        api_key: createDraft.api_key || undefined,
      });
      setCreateMode(false);
      setCreateDraft({
        name: '',
        clone: false,
        model: '',
        provider: '',
        base_url: '',
        api_key: '',
      });
      setFormError('');
      void mutateProfiles();
      toast(`Profile "${name}" created`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create profile.';
      setFormError(message);
    }
  }, [createDraft, active, mutateProfiles, toast]);

  const handleDelete = useCallback(
    async (name: string) => {
      if (!window.confirm(`Delete profile "${name}"?`)) return;
      try {
        await apiPost('/profile/delete', { name });
        if (selectedProfile === name) setSelectedProfile(null);
        void mutateProfiles();
        toast(`Profile "${name}" deleted`, 'success');
      } catch (err) {
        toast(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }
    },
    [mutateProfiles, selectedProfile, toast],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <User className="w-4 h-4" />
          {t18n('profiles.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => {
            setCreateMode(true);
            setSelectedProfile(null);
            setShowConceptHelp(false);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Profile list */}
        <div className="w-56 border-r border-[var(--border)] overflow-y-auto p-2 space-y-1">
          {/* Help card: Profiles vs Workspaces */}
          <button
            onClick={() => {
              setShowConceptHelp(true);
              setCreateMode(false);
              setSelectedProfile(null);
            }}
            className={cn(
              'w-full text-left px-3 py-2 mb-2 rounded-lg border transition-colors',
              showConceptHelp
                ? 'bg-[var(--accent-bg)] border-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover-bg)]',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
              <HelpCircle className="w-3 h-3 shrink-0 text-[var(--muted)]" />
              Profiles vs workspaces
            </div>
            <p className="mt-1 text-[10px] text-[var(--muted)] leading-tight">
              Use profiles for how the agent works; use workspaces for what files it works on.
            </p>
          </button>

          {profilesLoading && profiles.length === 0 && (
            <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>
          )}
          {profiles.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setSelectedProfile(p.name);
                setCreateMode(false);
                setShowConceptHelp(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg border border-[var(--border)] transition-colors',
                selectedProfile === p.name
                  ? 'bg-[var(--accent-bg)] border-[var(--accent)]'
                  : 'bg-[var(--surface)] hover:bg-[var(--hover-bg)]',
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {p.gateway_running ? (
                  <Wifi className="w-3 h-3 text-green-500 shrink-0" />
                ) : (
                  <WifiOff className="w-3 h-3 text-[var(--muted)] shrink-0" />
                )}
                <span className="text-sm font-medium text-[var(--text)] truncate">{p.name}</span>
                {p.name === active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">active</span>
                )}
                {p.is_default && <span className="text-[10px] text-[var(--muted)] opacity-60">default</span>}
                {p.is_default && <Rocket className="w-2.5 h-2.5 text-[var(--muted)] opacity-40" />}
                {p.visible === false && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                    <EyeOff className="w-2.5 h-2.5" />
                    Hidden from chat
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1 truncate">
                {p.model ? p.model.split('/').pop() : 'No model'} &middot; {p.provider || 'No provider'}
                {p.total_skills !== undefined &&
                  p.total_skills > 0 &&
                  ` · ${p.enabled_skills}/${p.total_skills} skills`}
              </div>
            </button>
          ))}
        </div>

        {/* Detail area */}
        <div className="flex-1 flex flex-col min-h-0">
          {showConceptHelp ? (
            /* Concept help card detail */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">Use profiles for how; workspaces for what</h3>
              <div className="space-y-2">
                <ConceptRow label="Profiles">
                  Agent identity, memory, skills, model/provider config, and connected tools. Create profiles for roles
                  like researcher, writer, marketer, or developer when those roles should carry different context or
                  capabilities.
                </ConceptRow>
                <ConceptRow label="Workspaces">
                  Project or product folders on disk. Use one workspace per repo/product so chat, terminal, and file
                  browsing point at the right files.
                </ConceptRow>
                <ConceptRow label="Together">
                  A profile can have a default workspace, but you can still switch workspaces for a session. Profiles
                  answer &ldquo;who is working?&rdquo;; workspaces answer &ldquo;where are they working?&rdquo;
                </ConceptRow>
              </div>
            </div>
          ) : createMode ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-sm font-medium text-[var(--text)]">Create Profile</h3>
              {/* Name */}
              <div>
                <label htmlFor="profile-name" className="text-xs font-medium text-[var(--muted)]">
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={createDraft.name}
                  onChange={(e) =>
                    setCreateDraft((d) => ({
                      ...d,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                    }))
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  placeholder="my-profile"
                  aria-label="Profile name"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  Lowercase letters, numbers, hyphens, underscores only. Must start with a letter or number.
                </p>
              </div>

              {/* Clone checkbox */}
              <label htmlFor="clone-profile" className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  aria-label="Clone from active profile"
                  id="clone-profile"
                  checked={createDraft.clone}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, clone: e.target.checked }))}
                />
                Clone config from active profile
              </label>

              {/* Model select + Provider (only when not cloning) */}
              {!createDraft.clone && (
                <>
                  <div>
                    <label htmlFor="profile-model" className="text-xs font-medium text-[var(--muted)]">
                      Model / Provider
                    </label>
                    <select
                      id="profile-model"
                      value={createDraft.model}
                      onChange={(e) => {
                        const modelId = e.target.value;
                        setCreateDraft((d) => ({
                          ...d,
                          model: modelId,
                          // Auto-populate provider from model selection
                          provider: modelId ? modelProviderLookup[modelId] || d.provider : d.provider,
                        }));
                      }}
                      className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
                      aria-label="Model"
                    >
                      <option value="">Use active profile default</option>
                      {modelGroups.map((g) => (
                        <optgroup key={g.provider} label={g.provider}>
                          {g.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label || m.id}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      Choose from configured providers and models for this new profile.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="profile-provider" className="text-xs font-medium text-[var(--muted)]">
                      Provider
                    </label>
                    <input
                      id="profile-provider"
                      type="text"
                      value={createDraft.provider}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, provider: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                      placeholder="openai"
                      aria-label="Provider"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-base-url" className="text-xs font-medium text-[var(--muted)]">
                      Base URL (optional)
                    </label>
                    <input
                      id="profile-base-url"
                      type="text"
                      value={createDraft.base_url}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, base_url: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                      aria-label="Base URL"
                      placeholder="http://localhost:11434"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-api-key" className="text-xs font-medium text-[var(--muted)]">
                      API Key (optional)
                    </label>
                    <input
                      id="profile-api-key"
                      type="password"
                      value={createDraft.api_key}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, api_key: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                      aria-label="API Key"
                    />
                  </div>
                </>
              )}

              {/* Error display */}
              {formError && (
                <div className="px-3 py-2 text-xs text-[var(--error)] bg-[var(--error)]/10 rounded border border-[var(--error)]/20">
                  {formError}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleCreate()} disabled={!createDraft.name.trim()}>
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreateMode(false);
                    setFormError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : selected ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renaming ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRename();
                          if (e.key === 'Escape') setRenaming(false);
                        }}
                        className="px-2 py-0.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                      />
                      <Button size="sm" onClick={() => void handleRename()} disabled={!renameValue.trim()}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRenaming(false);
                          setRenameError('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-medium text-[var(--text)]">{selected.name}</h3>
                  )}
                </div>
                <div className="flex gap-1">
                  {selected.name !== active && (
                    <Button size="sm" onClick={() => void handleSwitch(selected.name)}>
                      Activate
                    </Button>
                  )}
                  {!renaming && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[var(--muted)] hover:text-[var(--text)]"
                      onClick={() => {
                        setRenaming(true);
                        setRenameValue(selected.name);
                        setRenameError('');
                      }}
                      title="Rename profile"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {!selected.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[var(--muted)] hover:text-yellow-400"
                      onClick={() => void handleSetDefault(selected.name)}
                      title="Set as default"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-7 w-7', selected.visible === false ? 'text-[var(--muted)]' : 'text-[var(--text)]')}
                    onClick={() => void handleToggleVisibility(selected.name, selected.visible !== false)}
                    title={selected.visible === false ? 'Show in chat' : 'Hide from chat'}
                  >
                    {selected.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[var(--error)]"
                    onClick={() => void handleDelete(selected.name)}
                    disabled={selected.is_default}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {renameError && (
                <div className="px-3 py-1.5 text-xs text-[var(--error)] bg-[var(--error)]/10 rounded border border-[var(--error)]/20">
                  {renameError}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <Row label="Status">
                  {selected.name === active ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">Inactive</span>
                  )}
                </Row>
                <Row label="Gateway">
                  {selected.gateway_running ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> Running
                    </span>
                  ) : (
                    <span className="text-[var(--muted)] flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> Stopped
                    </span>
                  )}
                </Row>
                {selected.model && (
                  <Row label="Model">
                    <code className="text-xs bg-[var(--surface)] px-1 rounded">{selected.model}</code>
                  </Row>
                )}
                {selected.provider && <Row label="Provider">{selected.provider}</Row>}
                {selected.base_url && (
                  <Row label="Base URL">
                    <code className="text-xs bg-[var(--surface)] px-1 rounded">{selected.base_url}</code>
                  </Row>
                )}
                <Row label="API Key">
                  {selected.has_env ? (
                    <span className="text-green-400">Configured</span>
                  ) : (
                    <span className="text-[var(--muted)]">Not set</span>
                  )}
                </Row>
                {selected.total_skills !== undefined && selected.total_skills > 0 && (
                  <Row label="Skills">
                    {selected.enabled_skills}/{selected.total_skills}
                  </Row>
                )}
                {selected.default_workspace && (
                  <Row label="Default Workspace">
                    <code className="text-xs bg-[var(--surface)] px-1 rounded">{selected.default_workspace}</code>
                  </Row>
                )}
                {selected.is_default && (
                  <Row label="Default">
                    <span className="text-[var(--accent)]">Yes</span>
                  </Row>
                )}
                {selected.visible === false && (
                  <Row label="Visible">
                    <span className="text-[var(--muted)] flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Hidden from chat
                    </span>
                  </Row>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">
              Select a profile to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[var(--border)]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-[var(--text)]">{children}</span>
    </div>
  );
}

function ConceptRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="text-xs font-medium text-[var(--text)] mb-1">{label}</div>
      <div className="text-xs text-[var(--muted)] leading-relaxed">{children}</div>
    </div>
  );
}
