'use client';

import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { themeAtom, skinAtom, fontSizeAtom, defaultModelAtom, sendKeyAtom } from '@/atoms/settings';
import { ThemeSwitcher } from './theme-switcher';
import { SkinPicker } from './skin-picker';
import {
  Settings,
  MessageSquare,
  Palette,
  Sliders,
  Server,
  Puzzle,
  Monitor,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Key,
  Power,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Section = 'conversation' | 'appearance' | 'preferences' | 'providers' | 'plugins' | 'system';

const SECTIONS: { key: Section; label: string; icon: typeof Settings }[] = [
  { key: 'conversation', label: 'Conversation', icon: MessageSquare },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'preferences', label: 'Preferences', icon: Sliders },
  { key: 'providers', label: 'Providers', icon: Server },
  { key: 'plugins', label: 'Plugins', icon: Puzzle },
  { key: 'system', label: 'System', icon: Monitor },
];

export function SettingsPanel() {
  const [section, setSection] = useState<Section>('appearance');
  const [theme, setTheme] = useAtom(themeAtom);
  const [skin, setSkin] = useAtom(skinAtom);
  const [fontSize, setFontSize] = useAtom(fontSizeAtom);
  const [model, setModel] = useAtom(defaultModelAtom);
  const [sendKey, setSendKey] = useAtom(sendKeyAtom);

  const { data: _appSettings } = useSWR<Record<string, unknown>>('/settings', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: providers } = useSWR<{ providers: ProviderInfo[] }>('/providers', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: plugins } = useSWR<{ plugins: PluginEntry[] }>('/plugins', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: gatewayStatus } = useSWR<Record<string, unknown>>('/gateway/status', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: mcpServers } = useSWR<{ servers: MCPServer[] }>('/mcp/servers', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: modelsData } = useSWR<{ models: { id: string; name: string; provider: string }[] }>(
    '/models',
    fetcher,
    { revalidateOnFocus: false },
  );

  const handleExport = useCallback(async () => {
    try {
      const res = await fetch('/api/session/export', { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hermes-session-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await apiPost('/session/import', data);
      } catch (err) {
        console.error('Import failed:', err);
      }
    };
    input.click();
  }, []);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Clear all messages in this session?')) return;
    try {
      await apiPost('/session/clear', {});
    } catch (err) {
      console.error('Clear failed:', err);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </h2>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Section menu */}
        <div className="w-40 border-r border-[var(--border)] p-2 space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors',
                  section === s.key
                    ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--hover-bg)]',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {section === 'conversation' && (
            <ConversationSection onExport={handleExport} onImport={handleImport} onClear={handleClear} />
          )}

          {section === 'appearance' && (
            <>
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Theme</h3>
                <ThemeSwitcher current={theme} onChange={setTheme} />
              </div>
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Skin</h3>
                <SkinPicker current={skin} onChange={setSkin} />
              </div>
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Font Size</h3>
                <div className="flex gap-2">
                  {(['small', 'default', 'large', 'xlarge'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={cn(
                        'px-3 py-1.5 rounded text-xs border transition-colors capitalize',
                        fontSize === size
                          ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]'
                          : 'border-[var(--border)] hover:bg-[var(--hover-bg)]',
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {section === 'preferences' && (
            <PreferencesSection
              model={model}
              setModel={setModel}
              sendKey={sendKey}
              setSendKey={setSendKey}
              models={modelsData?.models ?? []}
            />
          )}

          {section === 'providers' && <ProvidersSection providers={providers?.providers ?? []} />}

          {section === 'plugins' && <PluginsSection plugins={plugins?.plugins ?? []} />}

          {section === 'system' && (
            <SystemSection gatewayStatus={gatewayStatus} mcpServers={mcpServers?.servers ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationSection({
  onExport,
  onImport,
  onClear,
}: {
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  return (
    <>
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Export / Import</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={onImport}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Import
          </Button>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Danger Zone</h3>
        <Button size="sm" variant="outline" className="text-[var(--error)] border-[var(--error)]/30" onClick={onClear}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Session
        </Button>
      </div>
    </>
  );
}

function PreferencesSection({
  model,
  setModel,
  sendKey,
  setSendKey,
  models,
}: {
  model: string | null;
  setModel: (m: string | null) => void;
  sendKey: string;
  setSendKey: (k: 'enter' | 'cmd-enter') => void;
  models: { id: string; name: string; provider: string }[];
}) {
  return (
    <>
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Default Model</h3>
        <select
          value={model || ''}
          onChange={(e) => setModel(e.target.value || null)}
          className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
          aria-label="Default model"
        >
          <option value="">System default</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider})
            </option>
          ))}
        </select>
      </div>
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Send Key</h3>
        <div className="flex gap-2">
          {(['enter', 'cmd-enter'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSendKey(k)}
              className={cn(
                'px-3 py-1.5 rounded text-xs border transition-colors',
                sendKey === k
                  ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--hover-bg)]',
              )}
            >
              {k === 'enter' ? 'Enter' : 'Cmd+Enter'}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ProvidersSection({ providers }: { providers: ProviderInfo[] }) {
  return (
    <>
      <h3 className="text-xs font-medium text-[var(--muted)]">Providers</h3>
      {providers.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-4 text-center">No providers configured</div>
      ) : (
        <div className="space-y-2 mt-2">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{p.name}</div>
                <div className="text-xs text-[var(--muted)]">{p.type}</div>
              </div>
              <div className="flex items-center gap-2">
                {p.configured ? (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">Not configured</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PluginsSection({ plugins }: { plugins: PluginEntry[] }) {
  return (
    <>
      <h3 className="text-xs font-medium text-[var(--muted)]">Plugins</h3>
      {plugins.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-4 text-center">No plugins installed</div>
      ) : (
        <div className="space-y-2 mt-2">
          {plugins.map((p) => (
            <div
              key={p.id || p.name}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{p.name}</div>
                {p.description && <div className="text-xs text-[var(--muted)]">{p.description}</div>}
              </div>
              {p.enabled !== undefined && (
                <button
                  aria-label={p.enabled ? 'Disable plugin' : 'Enable plugin'}
                  onClick={() => void apiPost('/plugins/toggle', { name: p.name, enabled: !p.enabled })}
                  className={cn(
                    'w-8 h-4 rounded-full transition-colors relative',
                    p.enabled ? 'bg-green-500' : 'bg-[var(--border)]',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                      p.enabled ? 'left-4' : 'left-0.5',
                    )}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SystemSection({
  gatewayStatus,
  mcpServers,
}: {
  gatewayStatus: Record<string, unknown> | undefined;
  mcpServers: MCPServer[];
}) {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; latest: string } | null>(null);

  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    try {
      const res = await apiPost<{ available: boolean; latest_version: string }>('/updates/check', {});
      setUpdateInfo({ available: res.available, latest: res.latest_version });
    } catch {
      setUpdateInfo(null);
    } finally {
      setChecking(false);
    }
  }, []);

  return (
    <>
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Gateway Status</h3>
        <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 text-sm">
            <Activity className={cn('w-3.5 h-3.5', gatewayStatus ? 'text-green-500' : 'text-[var(--muted)]')} />
            <span className="text-[var(--text)]">{gatewayStatus ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">MCP Servers</h3>
        {mcpServers.length === 0 ? (
          <div className="text-xs text-[var(--muted)]">No MCP servers configured</div>
        ) : (
          <div className="space-y-1">
            {mcpServers.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-xs"
              >
                <span className="text-[var(--text)]">{s.name}</span>
                <span className={cn(s.status === 'running' ? 'text-green-400' : 'text-[var(--muted)]')}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Updates</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleCheckUpdate()} disabled={checking}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', checking && 'animate-spin')} />
            Check for updates
          </Button>
          {updateInfo && (
            <span className="text-xs text-[var(--muted)]">
              {updateInfo.available ? `Update available: ${updateInfo.latest}` : 'Up to date'}
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Danger Zone</h3>
        <Button
          size="sm"
          variant="outline"
          className="text-[var(--error)] border-[var(--error)]/30"
          onClick={() => {
            if (window.confirm('Shut down Hermes server?')) void apiPost('/shutdown', {});
          }}
        >
          <Power className="w-3.5 h-3.5 mr-1" /> Shutdown Server
        </Button>
      </div>
    </>
  );
}

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  configured: boolean;
  base_url?: string;
}

interface PluginEntry {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

interface MCPServer {
  name: string;
  status: string;
}
