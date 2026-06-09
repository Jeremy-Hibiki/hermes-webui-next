'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { User, Plus, Trash2, Check, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAtom } from 'jotai';
import { activeProfileAtom, defaultModelAtom } from '@/atoms/settings';

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

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
}

interface ModelsResponse {
  models: ModelEntry[];
}

export function ProfilePanel() {
  const { data, mutate: mutateProfiles } = useSWR<ProfilesResponse>('/profiles', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: modelsData } = useSWR<ModelsResponse>('/models', fetcher, {
    revalidateOnFocus: false,
  });
  const [, setActiveProfile] = useAtom(activeProfileAtom);
  const [, setDefaultModel] = useAtom(defaultModelAtom);

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    name: '',
    clone: false,
    model: '',
    provider: '',
    base_url: '',
    api_key: '',
  });

  const profiles = data?.profiles ?? [];
  const active = data?.active ?? 'default';
  const selected = profiles.find((p) => p.name === selectedProfile);

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
        void mutateProfiles();
      } catch (err) {
        console.error('Failed to switch profile:', err);
      }
    },
    [mutateProfiles, setActiveProfile, setDefaultModel],
  );

  const handleCreate = useCallback(async () => {
    try {
      await apiPost('/profile/create', {
        name: createDraft.name,
        clone_config: createDraft.clone ? active : undefined,
        default_model: createDraft.model || undefined,
        model_provider: createDraft.provider || undefined,
        base_url: createDraft.base_url || undefined,
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
      void mutateProfiles();
    } catch (err) {
      console.error('Failed to create profile:', err);
    }
  }, [createDraft, active, mutateProfiles]);

  const handleDelete = useCallback(
    async (name: string) => {
      if (!window.confirm(`Delete profile "${name}"?`)) return;
      try {
        await apiPost('/profile/delete', { name });
        if (selectedProfile === name) setSelectedProfile(null);
        void mutateProfiles();
      } catch (err) {
        console.error('Failed to delete profile:', err);
      }
    },
    [mutateProfiles, selectedProfile],
  );

  const modelOptions = modelsData?.models ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <User className="w-4 h-4" />
          Profiles
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => {
            setCreateMode(true);
            setSelectedProfile(null);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Profile list */}
        <div className="w-56 border-r border-[var(--border)] overflow-y-auto p-2 space-y-1">
          {/* Info card */}
          <div className="px-3 py-2 mb-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)]">
            <strong className="text-[var(--text)]">Profiles vs workspaces</strong>
            <p className="mt-1">Profiles configure AI model/provider. Workspaces configure file access.</p>
          </div>

          {profiles.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setSelectedProfile(p.name);
                setCreateMode(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg border border-[var(--border)] transition-colors',
                selectedProfile === p.name
                  ? 'bg-[var(--accent-bg)] border-[var(--accent)]'
                  : 'bg-[var(--surface)] hover:bg-[var(--hover-bg)]',
              )}
            >
              <div className="flex items-center gap-2">
                {p.gateway_running ? (
                  <Wifi className="w-3 h-3 text-green-500 shrink-0" />
                ) : (
                  <WifiOff className="w-3 h-3 text-[var(--muted)] shrink-0" />
                )}
                <span className="text-sm font-medium text-[var(--text)] truncate flex-1">{p.name}</span>
                {p.name === active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">active</span>
                )}
                {p.is_default && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)]">
                    default
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1 truncate">
                {p.model || 'No model'} &middot; {p.provider || 'No provider'}
                {p.total_skills !== undefined && ` &middot; ${p.enabled_skills}/${p.total_skills} skills`}
              </div>
            </button>
          ))}
        </div>

        {/* Detail area */}
        <div className="flex-1 flex flex-col min-h-0">
          {createMode ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-sm font-medium text-[var(--text)]">Create Profile</h3>
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
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    }))
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  placeholder="my-profile"
                  aria-label="Profile name"
                />
              </div>
              <label htmlFor="clone-profile" className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  aria-label="Clone from active profile"
                  id="clone-profile"
                  checked={createDraft.clone}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, clone: e.target.checked }))}
                />
                Clone from active profile
              </label>
              {!createDraft.clone && (
                <>
                  <div>
                    <label htmlFor="profile-model" className="text-xs font-medium text-[var(--muted)]">
                      Model
                    </label>
                    <select
                      id="profile-model"
                      value={createDraft.model}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, model: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
                      aria-label="Model"
                    >
                      <option value="">Default</option>
                      {modelOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
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
                      placeholder="https://..."
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
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleCreate()} disabled={!createDraft.name.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreateMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : selected ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[var(--text)]">{selected.name}</h3>
                <div className="flex gap-1">
                  {selected.name !== active && (
                    <Button size="sm" onClick={() => void handleSwitch(selected.name)}>
                      Activate
                    </Button>
                  )}
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
                <Row label="Model">{selected.model || '—'}</Row>
                <Row label="Provider">{selected.provider || '—'}</Row>
                <Row label="Base URL">{selected.base_url || '—'}</Row>
                <Row label="API Key">
                  {selected.has_env ? (
                    <span className="text-green-400">Configured</span>
                  ) : (
                    <span className="text-[var(--muted)]">Not set</span>
                  )}
                </Row>
                <Row label="Skills">
                  {selected.total_skills !== undefined ? `${selected.enabled_skills}/${selected.total_skills}` : '—'}
                </Row>
                <Row label="Default Workspace">{selected.default_workspace || '—'}</Row>
                {selected.is_default && (
                  <Row label="Default">
                    <span className="text-[var(--accent)]">Yes</span>
                  </Row>
                )}
                {!selected.visible && (
                  <Row label="Visible">
                    <span className="text-[var(--muted)]">Hidden</span>
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
