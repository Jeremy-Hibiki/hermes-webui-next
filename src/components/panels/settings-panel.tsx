'use client';

import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import {
  themeAtom,
  skinAtom,
  fontSizeAtom,
  defaultModelAtom,
  sendKeyAtom,
  workspacePanelDefaultAtom,
  sessionJumpButtonsAtom,
  endlessScrollAtom,
  activityFeedExpandedAtom,
  hideSuggestionsAtom,
  languageAtom,
  rtlAtom,
  soundEnabledAtom,
  ttsEnabledAtom,
  ttsAutoReadAtom,
  voiceModeEnabledAtom,
  rawAudioAtom,
  ttsEngineAtom,
  ttsVoiceAtom,
  ttsRateAtom,
  ttsPitchAtom,
  notificationsEnabledAtom,
  tokenUsageAtom,
  quotaChipAtom,
  tpsAtom,
  fadeTextEffectAtom,
  compactToolActivityAtom,
  terminalAutoExpandAtom,
  apiRedactAtom,
  sidebarDensityAtom,
  pinnedSessionsLimitAtom,
  autoTitleRefreshAtom,
  busyInputModeAtom,
  showCliSessionsAtom,
  showCronSessionsAtom,
  showPreviousMessagingAtom,
  syncInsightsAtom,
  checkUpdatesAtom,
  ignoreAgentUpdatesAtom,
  whatsNewSummaryAtom,
  botNameAtom,
  dashboardModeAtom,
  dashboardUrlAtom,
} from '@/atoms/settings';
import { ThemeSwitcher } from './theme-switcher';
import { SkinPicker } from './skin-picker';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
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
  Volume2,
  Eye,
  Zap,
  Globe,
  Terminal,
} from 'lucide-react';

type Section = 'conversation' | 'appearance' | 'preferences' | 'providers' | 'plugins' | 'system';

const SECTIONS: { key: Section; labelKey: string; icon: typeof Settings }[] = [
  { key: 'conversation', labelKey: 'settings.conversation', icon: MessageSquare },
  { key: 'appearance', labelKey: 'settings.appearance', icon: Palette },
  { key: 'preferences', labelKey: 'settings.preferences', icon: Sliders },
  { key: 'providers', labelKey: 'settings.providers', icon: Server },
  { key: 'plugins', labelKey: 'settings.plugins', icon: Puzzle },
  { key: 'system', labelKey: 'settings.system', icon: Monitor },
];

// ---------- Reusable field components ----------

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--text)]">{label}</label>
      {children}
      {desc && <p className="text-[11px] text-[var(--muted)] leading-snug">{desc}</p>}
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5 min-w-0">
        <span className="text-sm text-[var(--text)]">{label}</span>
        {desc && <p className="text-[11px] text-[var(--muted)] leading-snug">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SelectField({
  label,
  desc,
  value,
  onChange,
  options,
}: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} desc={desc}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------- Main Settings Panel ----------

export function SettingsPanel() {
  const [section, setSection] = useState<Section>('appearance');

  return (
    <div className="flex flex-col h-full">
      <SettingsHeader section={section} onSectionChange={setSection} />
      <div className="flex flex-1 min-h-0">
        <SectionMenu section={section} onSectionChange={setSection} />
        <div className="flex-1 overflow-y-auto p-6 max-w-[640px] w-full mx-auto min-w-0 space-y-5">
          {section === 'conversation' && <ConversationSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'preferences' && <PreferencesSection />}
          {section === 'providers' && <ProvidersSection />}
          {section === 'plugins' && <PluginsSection />}
          {section === 'system' && <SystemSection />}
        </div>
      </div>
    </div>
  );
}

function SettingsHeader({
  section: _section,
  onSectionChange: _onSectionChange,
}: {
  section: Section;
  onSectionChange: (s: Section) => void;
}) {
  const { t: t18n } = useTranslation();
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
        <Settings className="w-4 h-4" />
        {t18n('settings.title')}
      </h2>
    </div>
  );
}

function SectionMenu({ section, onSectionChange }: { section: Section; onSectionChange: (s: Section) => void }) {
  const { t: t18n } = useTranslation();
  return (
    <div className="w-40 border-r border-[var(--border)] p-2 space-y-0.5 overflow-y-auto">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            onClick={() => onSectionChange(s.key)}
            className={cn(
              'w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors',
              section === s.key
                ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                : 'text-[var(--text)] hover:bg-[var(--hover-bg)]',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {t18n(s.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Conversation ----------

function ConversationSection() {
  const { t: t18n } = useTranslation();
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
  }, [t18n]);

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
  }, [t18n]);

  const handleClear = useCallback(async () => {
    if (!window.confirm(t18n('settings.clearConfirm'))) return;
    try {
      await apiPost('/session/clear', {});
    } catch (err) {
      console.error('Clear failed:', err);
    }
  }, [t18n]);

  return (
    <>
      <div className="text-[11px] text-[var(--muted)] mb-2">{t18n('settings.noActiveConversation')}</div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1" /> {t18n('settings.jsonExport')}
        </Button>
        <Button size="sm" variant="outline" onClick={handleImport}>
          <Upload className="w-3.5 h-3.5 mr-1" /> {t18n('settings.import')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[var(--error)] border-[var(--error)]/30"
          onClick={handleClear}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" /> {t18n('settings.clear')}
        </Button>
      </div>
    </>
  );
}

// ---------- Appearance ----------

function AppearanceSection() {
  const { t: t18n } = useTranslation();
  const [theme, setTheme] = useAtom(themeAtom);
  const [skin, setSkin] = useAtom(skinAtom);
  const [fontSize, setFontSize] = useAtom(fontSizeAtom);
  const [wsPanelDefault, setWsPanelDefault] = useAtom(workspacePanelDefaultAtom);
  const [jumpButtons, setJumpButtons] = useAtom(sessionJumpButtonsAtom);
  const [endlessScroll, setEndlessScroll] = useAtom(endlessScrollAtom);
  const [activityFeedExpanded, setActivityFeedExpanded] = useAtom(activityFeedExpandedAtom);

  return (
    <>
      <Field label={t18n('settings.theme')}>
        <ThemeSwitcher current={theme} onChange={setTheme} />
      </Field>
      <Field label={t18n('settings.skin')}>
        <SkinPicker current={skin} onChange={setSkin} />
      </Field>
      <Field label={t18n('settings.fontSize')}>
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
      </Field>
      <Toggle
        label={t18n('settings.keepWorkspacePanel')}
        desc={t18n('settings.keepWorkspacePanelDesc')}
        checked={wsPanelDefault}
        onCheckedChange={setWsPanelDefault}
      />
      <Toggle
        label={t18n('settings.showSessionJumpButtons')}
        desc={t18n('settings.showSessionJumpButtonsDesc')}
        checked={jumpButtons}
        onCheckedChange={setJumpButtons}
      />
      <Toggle
        label={t18n('settings.endlessScroll')}
        desc={t18n('settings.endlessScrollDesc')}
        checked={endlessScroll}
        onCheckedChange={setEndlessScroll}
      />
      <Toggle
        label={t18n('settings.expandActivityFeed')}
        desc={t18n('settings.expandActivityFeedDesc')}
        checked={activityFeedExpanded}
        onCheckedChange={setActivityFeedExpanded}
      />
    </>
  );
}

// ---------- Auxiliary Models ----------

const AUX_TASK_SLOTS = [
  { key: 'vision', nameKey: 'settings.auxTaskVision', descKey: 'settings.auxTaskVisionDesc' },
  { key: 'web_extract', nameKey: 'settings.auxTaskWebExtract', descKey: 'settings.auxTaskWebExtractDesc' },
  { key: 'compression', nameKey: 'settings.auxTaskCompression', descKey: 'settings.auxTaskCompressionDesc' },
  { key: 'session_search', nameKey: 'settings.auxTaskSessionSearch', descKey: 'settings.auxTaskSessionSearchDesc' },
  { key: 'skills_hub', nameKey: 'settings.auxTaskSkillsHub', descKey: 'settings.auxTaskSkillsHubDesc' },
  { key: 'approval', nameKey: 'settings.auxTaskApproval', descKey: 'settings.auxTaskApprovalDesc' },
  { key: 'mcp', nameKey: 'settings.auxTaskMcp', descKey: 'settings.auxTaskMcpDesc' },
  { key: 'title_generation', nameKey: 'settings.auxTaskTitleGen', descKey: 'settings.auxTaskTitleGenDesc' },
  { key: 'curator', nameKey: 'settings.auxTaskCurator', descKey: 'settings.auxTaskCuratorDesc' },
];

function AuxiliaryModelsSection() {
  const { t: t18n } = useTranslation();
  const { data: auxData } = useSWR<AuxModelsData>('/model/auxiliary', fetcher, { revalidateOnFocus: false });
  const { data: modelsData } = useSWR<{ groups: ModelGroup[] }>('/models', fetcher, { revalidateOnFocus: false });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localTasks, setLocalTasks] = useState<AuxTask[]>([]);

  const groups = modelsData?.groups ?? [];
  const providers = groups
    .filter((g) => g.provider && g.models && g.models.length > 0)
    .map((g) => ({
      slug: g.provider_id || g.provider,
      name: g.provider,
      models: g.models.map((m) => m.id),
    }));

  // Initialize local tasks from API data
  const remoteTasks = auxData?.tasks ?? [];
  if (localTasks.length === 0 && remoteTasks.length > 0) {
    setLocalTasks(remoteTasks);
  }

  const updateTask = useCallback(
    (taskKey: string, field: 'provider' | 'model', value: string) => {
      setLocalTasks((prev) =>
        prev.map((t) => {
          if (t.task !== taskKey) return t;
          return { ...t, [field]: value };
        }),
      );
      setDirty(true);
    },
    [t18n],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const tasks = localTasks.map((t) => ({
        task: t.task,
        provider: t.provider || 'auto',
        model: t.model || '',
      }));
      await apiPost('/model/auxiliary', { tasks });
      setDirty(false);
    } catch (err) {
      console.error('Failed to save auxiliary models:', err);
    } finally {
      setSaving(false);
    }
  }, [localTasks]);

  return (
    <div className="border-t border-[var(--border)] pt-4 space-y-3">
      <h3 className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> {t18n('settings.auxiliaryModels')}
      </h3>
      <p className="text-[11px] text-[var(--muted)]">{t18n('settings.auxiliaryModelsDesc')}</p>
      <div className="space-y-2">
        {AUX_TASK_SLOTS.map((slot) => {
          const task = localTasks.find((t) => t.task === slot.key);
          const taskProvider = task?.provider || 'auto';
          const providerData = providers.find((p) => p.slug === taskProvider);
          const modelOptions = providerData?.models ?? [];
          return (
            <div
              key={slot.key}
              className="flex items-start gap-2 px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="min-w-[90px] pt-1">
                <div className="text-xs font-medium text-[var(--text)]">{t18n(slot.nameKey)}</div>
                <div className="text-[10px] text-[var(--muted)]">{t18n(slot.descKey)}</div>
              </div>
              <select
                value={taskProvider}
                onChange={(e) => updateTask(slot.key, 'provider', e.target.value)}
                className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
              >
                <option value="auto">auto</option>
                {providers.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={task?.model || ''}
                onChange={(e) => updateTask(slot.key, 'model', e.target.value)}
                className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
              >
                <option value="">{t18n('settings.autoProviderDefault')}</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {dirty && (
        <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
          {saving ? `${t18n('common.save')}...` : t18n('settings.applyAuxModels')}
        </Button>
      )}
    </div>
  );
}

// ---------- Preferences ----------

function PreferencesSection() {
  const { t: t18n } = useTranslation();
  const [model, setModel] = useAtom(defaultModelAtom);
  const [sendKey, setSendKey] = useAtom(sendKeyAtom);
  const { data: modelsData } = useSWR<{ models: { id: string; name: string; provider: string }[] }>(
    '/models',
    fetcher,
    { revalidateOnFocus: false },
  );

  const [hideSuggestions, setHideSuggestions] = useAtom(hideSuggestionsAtom);
  const [lang, setLang] = useAtom(languageAtom);
  const [rtl, setRtl] = useAtom(rtlAtom);
  const [sound, setSound] = useAtom(soundEnabledAtom);
  const [tts, setTts] = useAtom(ttsEnabledAtom);
  const [ttsAutoRead, setTtsAutoRead] = useAtom(ttsAutoReadAtom);
  const [voiceMode, setVoiceMode] = useAtom(voiceModeEnabledAtom);
  const [rawAudio, setRawAudio] = useAtom(rawAudioAtom);
  const [ttsEngine, setTtsEngine] = useAtom(ttsEngineAtom);
  const [ttsVoice, setTtsVoice] = useAtom(ttsVoiceAtom);
  const [ttsRate, setTtsRate] = useAtom(ttsRateAtom);
  const [ttsPitch, setTtsPitch] = useAtom(ttsPitchAtom);
  const [notifications, setNotifications] = useAtom(notificationsEnabledAtom);
  const [tokenUsage, setTokenUsage] = useAtom(tokenUsageAtom);
  const [quotaChip, setQuotaChip] = useAtom(quotaChipAtom);
  const [tps, setTps] = useAtom(tpsAtom);
  const [fadeText, setFadeText] = useAtom(fadeTextEffectAtom);
  const [compactTools, setCompactTools] = useAtom(compactToolActivityAtom);
  const [terminalAutoExpand, setTerminalAutoExpand] = useAtom(terminalAutoExpandAtom);
  const [apiRedact, setApiRedact] = useAtom(apiRedactAtom);
  const [sidebarDensity, setSidebarDensity] = useAtom(sidebarDensityAtom);
  const [pinnedLimit, setPinnedLimit] = useAtom(pinnedSessionsLimitAtom);
  const [autoTitleRefresh, setAutoTitleRefresh] = useAtom(autoTitleRefreshAtom);
  const [busyInputMode, setBusyInputMode] = useAtom(busyInputModeAtom);
  const [showCli, setShowCli] = useAtom(showCliSessionsAtom);
  const [showCron, setShowCron] = useAtom(showCronSessionsAtom);
  const [showPrevMsg, setShowPrevMsg] = useAtom(showPreviousMessagingAtom);
  const [syncInsights, setSyncInsights] = useAtom(syncInsightsAtom);
  const [checkUpd, setCheckUpd] = useAtom(checkUpdatesAtom);
  const [ignoreAgentUpd, setIgnoreAgentUpd] = useAtom(ignoreAgentUpdatesAtom);
  const [whatsNew, setWhatsNew] = useAtom(whatsNewSummaryAtom);
  const [botName, setBotName] = useAtom(botNameAtom);

  const models = modelsData?.models ?? [];

  // Collect available browser TTS voices (client-side only)
  const [browserVoices] = useState<{ value: string; label: string }[]>(() => {
    if (typeof speechSynthesis === 'undefined') return [];
    return speechSynthesis.getVoices().map((v) => ({
      value: v.voiceURI,
      label: `${v.name} (${v.lang})`,
    }));
  });

  return (
    <>
      {/* Model */}
      <SelectField
        label={t18n('settings.defaultModel')}
        desc={t18n('settings.defaultModelDesc')}
        value={model || ''}
        onChange={(v) => setModel(v || null)}
        options={[
          { value: '', label: t18n('settings.systemDefault') },
          ...models.map((m) => ({ value: m.id, label: `${m.name} (${m.provider})` })),
        ]}
      />

      {/* Auxiliary models */}
      <AuxiliaryModelsSection />

      {/* Send Key */}
      <SelectField
        label={t18n('settings.sendKey')}
        value={sendKey}
        onChange={(v) => setSendKey(v as 'enter' | 'ctrl+enter')}
        options={[
          { value: 'enter', label: t18n('settings.enterShiftNewline') },
          { value: 'ctrl+enter', label: t18n('settings.ctrlEnterNewline') },
        ]}
      />

      {/* Language */}
      <SelectField
        label={t18n('settings.language')}
        value={lang}
        onChange={setLang}
        options={[
          { value: 'en', label: 'English' },
          { value: 'zh', label: 'Chinese (Simplified)' },
          { value: 'ja', label: 'Japanese' },
          { value: 'ko', label: 'Korean' },
          { value: 'de', label: 'German' },
          { value: 'fr', label: 'French' },
          { value: 'es', label: 'Spanish' },
          { value: 'pt', label: 'Portuguese' },
          { value: 'ar', label: 'Arabic' },
          { value: 'he', label: 'Hebrew' },
        ]}
      />

      {/* Bot Name */}
      <Field label={t18n('settings.defaultAssistantName')} desc={t18n('settings.defaultAssistantNameDesc')}>
        <input
          type="text"
          value={botName}
          onChange={(e) => setBotName(e.target.value)}
          placeholder="Hermes"
          maxLength={64}
          className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
        />
      </Field>

      {/* Toggles */}
      <Toggle
        label={t18n('settings.hideSuggestions')}
        desc={t18n('settings.hideSuggestionsDesc')}
        checked={hideSuggestions}
        onCheckedChange={setHideSuggestions}
      />
      <Toggle
        label={t18n('settings.rtlLayout')}
        desc={t18n('settings.rtlLayoutDesc')}
        checked={rtl}
        onCheckedChange={setRtl}
      />

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--muted)] mb-3 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5" /> {t18n('settings.audio')}
        </h3>
        <div className="space-y-4">
          <Toggle
            label={t18n('settings.notificationSound')}
            desc={t18n('settings.notificationSoundDesc')}
            checked={sound}
            onCheckedChange={setSound}
          />
          <Toggle label={t18n('settings.tts')} desc={t18n('settings.ttsDesc')} checked={tts} onCheckedChange={setTts} />
          {tts && (
            <>
              <Toggle
                label={t18n('settings.ttsAutoRead')}
                desc={t18n('settings.ttsAutoReadDesc')}
                checked={ttsAutoRead}
                onCheckedChange={setTtsAutoRead}
              />
              <SelectField
                label={t18n('settings.ttsEngine')}
                desc={t18n('settings.ttsEngineDesc')}
                value={ttsEngine}
                onChange={(v) => setTtsEngine(v as 'browser' | 'edge')}
                options={[
                  { value: 'browser', label: t18n('settings.ttsEngine.browser') },
                  { value: 'edge', label: t18n('settings.ttsEngine.edge') },
                ]}
              />
              {browserVoices.length > 0 && (
                <SelectField
                  label={t18n('settings.ttsVoice')}
                  desc={t18n('settings.ttsVoiceDesc')}
                  value={ttsVoice}
                  onChange={setTtsVoice}
                  options={[{ value: '', label: t18n('settings.defaultSystemVoice') }, ...browserVoices]}
                />
              )}
              <Field label={t18n('settings.speechRate')}>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[ttsRate]}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onValueChange={(v) => {
                      const n = Array.isArray(v) ? v[0] : v;
                      if (n != null) setTtsRate(n);
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs text-[var(--muted)] w-10 text-right">{ttsRate.toFixed(1)}x</span>
                </div>
              </Field>
              <Field label={t18n('settings.speechPitch')}>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[ttsPitch]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={(v) => {
                      const n = Array.isArray(v) ? v[0] : v;
                      if (n != null) setTtsPitch(n);
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs text-[var(--muted)] w-10 text-right">{ttsPitch.toFixed(1)}</span>
                </div>
              </Field>
            </>
          )}
          <Toggle
            label={t18n('settings.voiceMode')}
            desc={t18n('settings.voiceModeDesc')}
            checked={voiceMode}
            onCheckedChange={setVoiceMode}
          />
          <Toggle
            label={t18n('settings.rawAudio')}
            desc={t18n('settings.rawAudioDesc')}
            checked={rawAudio}
            onCheckedChange={setRawAudio}
          />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--muted)] mb-3 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> {t18n('settings.display')}
        </h3>
        <div className="space-y-4">
          <Toggle
            label={t18n('settings.browserNotifications')}
            desc={t18n('settings.browserNotificationsDesc')}
            checked={notifications}
            onCheckedChange={setNotifications}
          />
          <Toggle
            label={t18n('settings.tokenUsage')}
            desc={t18n('settings.tokenUsageDesc')}
            checked={tokenUsage}
            onCheckedChange={setTokenUsage}
          />
          <Toggle
            label={t18n('settings.quotaChip')}
            desc={t18n('settings.quotaChipDesc')}
            checked={quotaChip}
            onCheckedChange={setQuotaChip}
          />
          <Toggle label={t18n('settings.tps')} desc={t18n('settings.tpsDesc')} checked={tps} onCheckedChange={setTps} />
          <Toggle
            label={t18n('settings.fadeText')}
            desc={t18n('settings.fadeTextDesc')}
            checked={fadeText}
            onCheckedChange={setFadeText}
          />
          <Toggle
            label={t18n('settings.compactTools')}
            desc={t18n('settings.compactToolsDesc')}
            checked={compactTools}
            onCheckedChange={setCompactTools}
          />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--muted)] mb-3 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5" /> {t18n('settings.behavior')}
        </h3>
        <div className="space-y-4">
          <Toggle
            label={t18n('settings.terminalAutoExpand')}
            desc={t18n('settings.terminalAutoExpandDesc')}
            checked={terminalAutoExpand}
            onCheckedChange={setTerminalAutoExpand}
          />
          <Toggle
            label={t18n('settings.apiRedact')}
            desc={t18n('settings.apiRedactDesc')}
            checked={apiRedact}
            onCheckedChange={setApiRedact}
          />
          <SelectField
            label={t18n('settings.sidebarDensity')}
            desc={t18n('settings.sidebarDensityDesc')}
            value={sidebarDensity}
            onChange={(v) => setSidebarDensity(v as 'compact' | 'detailed')}
            options={[
              { value: 'compact', label: t18n('settings.sidebarCompact') },
              { value: 'detailed', label: t18n('settings.sidebarDetailed') },
            ]}
          />
          <Field label={t18n('settings.pinnedLimit')} desc={t18n('settings.pinnedLimitDesc')}>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              value={pinnedLimit}
              onChange={(e) => setPinnedLimit(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
            />
          </Field>
          <SelectField
            label={t18n('settings.autoTitleRefresh')}
            desc={t18n('settings.autoTitleRefreshDesc')}
            value={autoTitleRefresh}
            onChange={(v) => setAutoTitleRefresh(v as '0' | '5' | '10' | '20')}
            options={[
              { value: '0', label: t18n('settings.autoTitleRefresh.off') },
              { value: '5', label: t18n('settings.autoTitleRefresh.5') },
              { value: '10', label: t18n('settings.autoTitleRefresh.10') },
              { value: '20', label: t18n('settings.autoTitleRefresh.20') },
            ]}
          />
          <SelectField
            label={t18n('settings.busyInputMode')}
            desc={t18n('settings.busyInputModeDesc')}
            value={busyInputMode}
            onChange={(v) => setBusyInputMode(v as 'queue' | 'interrupt' | 'steer')}
            options={[
              { value: 'queue', label: t18n('settings.busyInputMode.queue') },
              { value: 'interrupt', label: t18n('settings.busyInputMode.interrupt') },
              { value: 'steer', label: t18n('settings.busyInputMode.steer') },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--muted)] mb-3 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> {t18n('settings.sessions')}
        </h3>
        <div className="space-y-4">
          <Toggle
            label={t18n('settings.showCliSessions')}
            desc={t18n('settings.showCliSessionsDesc')}
            checked={showCli}
            onCheckedChange={setShowCli}
          />
          {showCli && (
            <Toggle
              label={t18n('settings.showCronSessions')}
              desc={t18n('settings.showCronSessionsDesc')}
              checked={showCron}
              onCheckedChange={setShowCron}
            />
          )}
          <Toggle
            label={t18n('settings.showPrevMessaging')}
            desc={t18n('settings.showPrevMessagingDesc')}
            checked={showPrevMsg}
            onCheckedChange={setShowPrevMsg}
          />
          <Toggle
            label={t18n('settings.syncInsights')}
            desc={t18n('settings.syncInsightsDesc')}
            checked={syncInsights}
            onCheckedChange={setSyncInsights}
          />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--muted)] mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> {t18n('settings.updates')}
        </h3>
        <div className="space-y-4">
          <Toggle
            label={t18n('settings.checkUpdates')}
            desc={t18n('settings.checkUpdatesDesc')}
            checked={checkUpd}
            onCheckedChange={setCheckUpd}
          />
          {checkUpd && (
            <Toggle
              label={t18n('settings.ignoreAgentUpdates')}
              desc={t18n('settings.ignoreAgentUpdatesDesc')}
              checked={ignoreAgentUpd}
              onCheckedChange={setIgnoreAgentUpd}
            />
          )}
          <Toggle
            label={t18n('settings.whatsNewAi')}
            desc={t18n('settings.whatsNewAiDesc')}
            checked={whatsNew}
            onCheckedChange={setWhatsNew}
          />
        </div>
      </div>
    </>
  );
}

// ---------- Providers ----------

function ProvidersSection() {
  const { t: t18n } = useTranslation();
  const { data: providers } = useSWR<{ providers: ProviderInfo[] }>('/providers', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: quota, mutate: mutateQuota } = useSWR<QuotaStatus>(
    '/provider/quota',
    (path: string) =>
      fetcher<QuotaStatus>(path).catch(() => ({
        ok: false,
        status: 'unavailable',
        quota: null,
        message: 'Failed to load quota',
      })),
    { revalidateOnFocus: false },
  );
  const [refreshing, setRefreshing] = useState(false);
  const ps = providers?.providers ?? [];

  const handleRefreshQuota = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetcher<QuotaStatus>('/provider/quota?refresh=true');
      mutateQuota(res, { revalidate: false });
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, [mutateQuota]);

  return (
    <>
      <p className="text-[11px] text-[var(--muted)] mb-3">{t18n('settings.providerIntro')}</p>

      {/* Provider quota card */}
      {quota && quota.supported !== false && (
        <ProviderQuotaCard quota={quota} refreshing={refreshing} onRefresh={() => void handleRefreshQuota()} />
      )}

      {ps.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-4 text-center">{t18n('settings.noProviders')}</div>
      ) : (
        <div className="space-y-2">
          {ps.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </>
  );
}

function ProviderQuotaCard({
  quota,
  refreshing,
  onRefresh,
}: {
  quota: QuotaStatus;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t: t18n } = useTranslation();
  const state = (quota.status || 'unavailable').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'unavailable';
  const accountLimits = quota.account_limits ?? null;
  const displayName = quota.display_name || quota.provider || 'Active provider';
  const provider = accountLimits?.plan ? `${displayName} · ${accountLimits.plan}` : displayName;
  const windows = accountLimits?.windows ?? [];
  const pool = accountLimits?.pool;

  const formatMoney = (v?: number | string | null) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
  };

  const formatPercent = (v?: number | string | null) => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : '';
  };

  const _formatReset = (v?: string) => {
    if (!v) return '';
    try {
      return new Date(v).toLocaleString();
    } catch {
      return v;
    }
  };

  const statusLabel: Record<string, string> = {
    available: t18n('settings.quota.available'),
    exhausted: t18n('settings.quota.exhausted'),
    unavailable: t18n('settings.quota.unavailable'),
    failed: t18n('settings.quota.failed'),
    checked: t18n('settings.quota.checked'),
    no_key: t18n('settings.quota.noKey'),
    unsupported: t18n('settings.quota.unsupported'),
  };

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-3 space-y-2',
        state === 'available'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : state === 'exhausted'
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-[var(--border)] bg-[var(--surface)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[var(--text)]">{t18n('settings.providerQuota')}</div>
          <div className="text-xs text-[var(--muted)]">{provider}</div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              state === 'available'
                ? 'bg-emerald-500/10 text-emerald-400'
                : state === 'exhausted'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-[var(--accent-bg)] text-[var(--muted)]',
            )}
          >
            {statusLabel[state] || state}
          </span>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="text-[10px] px-2 py-0.5 border border-[var(--border)] rounded bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-50"
          >
            {refreshing ? `${t18n('common.refresh')}...` : t18n('common.refresh')}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {quota.ok && quota.quota && !accountLimits ? (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">{t18n('settings.remaining')}</span>
              <span className="text-[var(--text)] font-medium">{formatMoney(quota.quota.limit_remaining)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">{t18n('settings.used')}</span>
              <span className="text-[var(--text)] font-medium">{formatMoney(quota.quota.usage)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted)]">{t18n('settings.limit')}</span>
              <span className="text-[var(--text)] font-medium">{formatMoney(quota.quota.limit)}</span>
            </div>
          </>
        ) : windows.length > 0 ? (
          windows.map((w, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-[var(--muted)]">{w.label || t18n('settings.quota.usageWindow')}</span>
              <span className="text-[var(--text)] font-medium">{formatPercent(w.remaining_percent)}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-[var(--muted)]">{quota.message || t18n('settings.quotaUnavailable')}</div>
        )}
        {pool && pool.credentials.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-[var(--muted)] cursor-pointer">
              {t18n('settings.credentialPool')}: {pool.available_credentials ?? 0}/
              {pool.total_credentials ?? pool.credentials.length} {t18n('settings.available')}
            </summary>
            <div className="mt-1 space-y-1 pl-2">
              {pool.credentials.map((cred, i) => (
                <div key={i} className="text-xs flex justify-between">
                  <span className="text-[var(--muted)]">
                    {cred.label || `${t18n('settings.quota.credential')} ${i + 1}`}
                    {cred.plan ? ` · ${cred.plan}` : ''}
                  </span>
                  <span className={cn(cred.status === 'available' ? 'text-emerald-400' : 'text-[var(--muted)]')}>
                    {statusLabel[cred.status || ''] || cred.status || t18n('settings.quota.unknown')}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ProviderCard({ provider: p }: { provider: ProviderInfo }) {
  const { t: t18n } = useTranslation();
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      await apiPost('/providers', { provider: p.id, api_key: keyValue.trim() });
      setKeyValue('');
    } catch (err) {
      console.error('Failed to save key:', err);
    } finally {
      setSaving(false);
    }
  }, [p.id, keyValue]);

  return (
    <div className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--text)]">{p.name}</div>
          <div className="text-xs text-[var(--muted)]">{p.type}</div>
        </div>
        {p.configured ? (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Key className="w-3 h-3" /> {t18n('settings.configured')}
          </span>
        ) : (
          <span className="text-xs text-[var(--muted)]">{t18n('settings.notConfigured')}</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          placeholder={p.configured ? t18n('settings.updateApiKey') : t18n('settings.enterApiKey')}
          className="flex-1 px-2 py-1 text-xs border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
        />
        <Button size="sm" disabled={!keyValue.trim() || saving} onClick={() => void handleSave()}>
          {t18n('common.save')}
        </Button>
      </div>
    </div>
  );
}

// ---------- Plugins ----------

function PluginsSection() {
  const { t: t18n } = useTranslation();
  const { data: plugins } = useSWR<{ plugins: PluginEntry[] }>('/plugins', fetcher, {
    revalidateOnFocus: false,
  });
  const ps = plugins?.plugins ?? [];

  return (
    <>
      <p className="text-[11px] text-[var(--muted)] mb-3">{t18n('settings.pluginIntro')}</p>
      {ps.length === 0 ? (
        <div className="text-sm text-[var(--muted)] py-4 text-center">{t18n('settings.noPlugins')}</div>
      ) : (
        <div className="space-y-2">
          {ps.map((p) => {
            const activation =
              typeof p.activation === 'string' ? p.activation : p.enabled === false ? 'disabled' : 'enabled';
            const hooks = Array.isArray(p.hooks) ? p.hooks : [];
            const hasTab = !!p.tab?.path;
            return (
              <div
                key={p.id || p.key || p.name}
                className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[var(--text)]">{p.name}</span>
                    {p.version && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)] font-mono">
                        v{p.version}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      activation === 'enabled' || activation === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-[var(--accent-bg)] text-[var(--muted)]',
                    )}
                  >
                    {activation === 'enabled'
                      ? t18n('common.enabled')
                      : activation === 'disabled'
                        ? t18n('common.disabled')
                        : activation}
                  </span>
                </div>
                {(p.key || p.description) && (
                  <div className="text-xs text-[var(--muted)]">
                    {p.key ? `${p.key}` : ''}
                    {p.description ? `${p.key ? ' — ' : ''}${p.description}` : ''}
                  </div>
                )}
                {hooks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hooks.map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] font-mono"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                {hasTab && (
                  <div>
                    <a href={p.tab!.path} className="text-xs text-[var(--accent)] hover:underline">
                      {p.tab!.label || p.name || t18n('settings.open')} &#x2197;
                    </a>
                  </div>
                )}
                {p.enabled !== undefined && (
                  <div className="flex justify-end pt-1">
                    <Switch checked={p.enabled} disabled aria-label="Plugin enabled status (read-only)" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- System ----------

function SystemSection() {
  const { t: t18n } = useTranslation();
  const { data: gatewayStatus } = useSWR<Record<string, unknown>>('/gateway/status', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: mcpServers } = useSWR<{ servers: MCPServer[] }>('/mcp/servers', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: versionData } = useSWR<{ webui_version: string; agent_version: string }>('/version', fetcher, {
    revalidateOnFocus: false,
  });

  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; latest: string } | null>(null);
  const [password, setPassword] = useState('');
  const [dashboardMode, setDashboardMode] = useAtom(dashboardModeAtom);
  const [dashboardUrl, setDashboardUrl] = useAtom(dashboardUrlAtom);

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
  }, [t18n]);

  const handleSavePassword = useCallback(async () => {
    if (!password) return;
    try {
      await apiPost('/settings', { _set_password: password });
      setPassword('');
    } catch (err) {
      console.error('Password save failed:', err);
    }
  }, [password]);

  const handleSaveDashboard = useCallback(async () => {
    try {
      await apiPost('/settings', { dashboard_mode: dashboardMode, dashboard_url: dashboardUrl });
    } catch (err) {
      console.error('Dashboard save failed:', err);
    }
  }, [dashboardMode, dashboardUrl]);

  const handleShutdown = useCallback(() => {
    if (window.confirm(t18n('settings.shutdownConfirm'))) void apiPost('/shutdown', {});
  }, [t18n]);

  const servers = mcpServers?.servers ?? [];

  return (
    <>
      {/* Version */}
      <div className="flex items-center gap-2 flex-wrap">
        {versionData?.webui_version && (
          <span className="text-xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
            {t18n('settings.webui')}: {versionData.webui_version}
          </span>
        )}
        {versionData?.agent_version && (
          <span className="text-xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
            {t18n('settings.agent')}: {versionData.agent_version}
          </span>
        )}
      </div>

      {/* Updates */}
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">{t18n('settings.updates')}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleCheckUpdate()} disabled={checking}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', checking && 'animate-spin')} />
            {t18n('settings.checkNow')}
          </Button>
          {updateInfo && (
            <span className="text-xs text-[var(--muted)]">
              {updateInfo.available
                ? t18n('settings.updateAvailable').replace('{version}', updateInfo.latest)
                : t18n('settings.upToDate')}
            </span>
          )}
        </div>
      </div>

      {/* Password */}
      <div>
        <Field label={t18n('settings.accessPassword')} desc={t18n('settings.accessPasswordDesc')}>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t18n('settings.enterNewPassword')}
              className="flex-1 px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
            />
            <Button size="sm" disabled={!password} onClick={() => void handleSavePassword()}>
              {t18n('common.save')}
            </Button>
          </div>
        </Field>
      </div>

      {/* Sign Out */}
      <div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
              .then(() => window.location.reload())
              .catch(() => {});
          }}
          className="text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/10"
        >
          <Power className="w-3.5 h-3.5 mr-1" />
          {t18n('settings.signOut')}
        </Button>
      </div>

      {/* Gateway */}
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">{t18n('settings.gatewayStatus')}</h3>
        <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 text-sm">
            <Activity className={cn('w-3.5 h-3.5', gatewayStatus ? 'text-green-500' : 'text-[var(--muted)]')} />
            <span className="text-[var(--text)]">
              {gatewayStatus ? t18n('settings.connected') : t18n('settings.disconnected')}
            </span>
          </div>
        </div>
      </div>

      {/* MCP Servers */}
      <div>
        <h3 className="text-xs font-medium text-[var(--muted)] mb-2">{t18n('settings.mcpServers')}</h3>
        <p className="text-[11px] text-[var(--muted)] mb-2">{t18n('settings.mcpIntro')}</p>
        {servers.length === 0 ? (
          <div className="text-xs text-[var(--muted)]">{t18n('settings.noMcpServers')}</div>
        ) : (
          <div className="space-y-1">
            {servers.map((s) => (
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

      {/* Dashboard */}
      <div>
        <Field label={t18n('settings.dashboard')} desc={t18n('settings.dashboardDesc')}>
          <select
            value={dashboardMode}
            onChange={(e) => setDashboardMode(e.target.value as 'auto' | 'always' | 'never')}
            className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none mb-2"
          >
            <option value="auto">{t18n('settings.autoDetect')}</option>
            <option value="always">{t18n('settings.alwaysShow')}</option>
            <option value="never">{t18n('settings.neverShow')}</option>
          </select>
          <input
            type="text"
            value={dashboardUrl}
            onChange={(e) => setDashboardUrl(e.target.value)}
            placeholder="http://127.0.0.1:9119"
            className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none mb-2"
          />
          <Button size="sm" onClick={() => void handleSaveDashboard()}>
            {t18n('settings.saveDashboardSettings')}
          </Button>
        </Field>
      </div>

      {/* Shutdown */}
      <div className="border-t border-[var(--border)] pt-4">
        <Field label={t18n('settings.stopServer')} desc={t18n('settings.stopServerDesc')}>
          <Button
            size="sm"
            variant="outline"
            className="text-[var(--error)] border-[var(--error)]/30"
            onClick={handleShutdown}
          >
            <Power className="w-3.5 h-3.5 mr-1" /> {t18n('settings.stopServerButton')}
          </Button>
        </Field>
      </div>
    </>
  );
}

// ---------- Types ----------

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  configured: boolean;
  base_url?: string;
}

interface PluginEntry {
  id?: string;
  key?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  activation?: string;
  version?: string;
  hooks?: string[];
  tab?: { path: string; label?: string };
}

interface MCPServer {
  name: string;
  status: string;
}

interface QuotaWindow {
  label?: string;
  used_percent?: number | string;
  remaining_percent?: number | string;
  reset_at?: string;
  detail?: string;
}

interface QuotaCredential {
  label?: string;
  status?: string;
  plan?: string;
  windows?: QuotaWindow[];
  details?: string[];
  retry_after?: string;
  unavailable_reason?: string;
}

interface QuotaPool {
  total_credentials?: number;
  available_credentials?: number;
  exhausted_credentials?: number;
  failed_credentials?: number;
  queried_credentials?: number;
  credentials: QuotaCredential[];
  plans?: string[];
}

interface QuotaStatus {
  ok: boolean;
  provider?: string | null;
  display_name?: string | null;
  supported?: boolean;
  status: string;
  quota?: {
    limit_remaining?: number | string;
    usage?: number | string;
    limit?: number | string;
  } | null;
  account_limits?: {
    provider?: string;
    plan?: string;
    fetched_at?: string;
    windows?: QuotaWindow[];
    details?: string[];
    pool?: QuotaPool;
  } | null;
  message?: string;
  client_fetched_at?: string;
}

interface AuxTask {
  task: string;
  provider?: string;
  model?: string;
  base_url?: string;
}

interface AuxModelsData {
  tasks: AuxTask[];
  main: { provider: string; model: string };
}

interface ModelGroup {
  provider: string;
  provider_id?: string;
  models: { id: string; label?: string }[];
}
