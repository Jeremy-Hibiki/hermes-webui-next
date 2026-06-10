'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { Zap, Search, Plus, ChevronDown, ChevronRight, Pencil, Trash2, X, FileText, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/lib/i18n';

interface Skill {
  name: string;
  description?: string;
  category?: string;
  disabled?: boolean;
}

interface SkillsResponse {
  skills: Skill[];
}

interface SkillContent {
  content: string;
  linked_files?: Record<string, string[]>;
}

interface FileContent {
  content: string;
  path: string;
}

/** Separate YAML frontmatter (--- ... ---) from the markdown body. */
function stripYamlFrontmatter(raw: string | undefined): { frontmatter: string | null; body: string } {
  if (!raw) return { frontmatter: null, body: '' };
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { frontmatter: null, body: raw };
  return { frontmatter: m[1], body: raw.slice(m[0].length) };
}

/** Determine whether a file extension indicates markdown. */
function isMarkdownFile(path: string): boolean {
  const ext = (path.split('.').pop() || '').toLowerCase();
  return ['md', 'markdown'].includes(ext);
}

export function SkillsPanel() {
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [createDraft, setCreateDraft] = useState({ name: '', category: '', content: '' });
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const { toast } = useToast();
  const { t: t18n } = useTranslation();

  const { data, mutate } = useSWR<SkillsResponse>('/skills', fetcher, { revalidateOnFocus: false });
  const skills = useMemo(() => data?.skills ?? [], [data]);

  const { data: skillContent, error: skillContentError } = useSWR<SkillContent>(
    selectedSkill ? `/skills/content?name=${encodeURIComponent(selectedSkill)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: fileContent } = useSWR<FileContent>(
    viewingFile
      ? `/skills/content?name=${encodeURIComponent(selectedSkill!)}&file=${encodeURIComponent(viewingFile)}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const grouped = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const s of skills) {
      const cat = s.category || 'general';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [skills]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(([cat, entries]) => [
        cat,
        entries.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            cat.toLowerCase().includes(q),
        ),
      ])
      .filter(([, entries]) => (entries as Skill[]).length > 0) as [string, Skill[]][];
  }, [grouped, search]);

  const toggleGroup = useCallback((cat: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleToggle = useCallback(
    async (name: string, enabled: boolean) => {
      try {
        await apiPost('/skills/toggle', { name, enabled });
        void mutate();
      } catch (err) {
        console.error('Failed to toggle skill:', err);
      }
    },
    [mutate],
  );

  const handleSelect = useCallback((name: string) => {
    setSelectedSkill(name);
    setEditMode(false);
    setViewingFile(null);
    setCreateMode(false);
  }, []);

  const handleSave = useCallback(
    async (name: string, category: string, content: string) => {
      try {
        await apiPost('/skills/save', { name, category: category || undefined, content });
        void mutate();
        setEditMode(false);
        setCreateMode(false);
        setCreateDraft({ name: '', category: '', content: '' });
        if (!selectedSkill) setSelectedSkill(name);
        toast(editMode ? 'Skill updated' : 'Skill created', 'success');
      } catch (err) {
        console.error('Failed to save skill:', err);
        toast('Failed to save skill: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
    },
    [mutate, selectedSkill, editMode, toast],
  );

  const handleDelete = useCallback(
    async (name: string) => {
      if (!window.confirm(`Delete skill "${name}"?`)) return;
      try {
        await apiPost('/skills/delete', { name });
        if (selectedSkill === name) {
          setSelectedSkill(null);
          setEditMode(false);
        }
        void mutate();
        toast('Skill deleted', 'success');
      } catch (err) {
        console.error('Failed to delete skill:', err);
        toast('Failed to delete skill: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
    },
    [mutate, selectedSkill, toast],
  );

  const startEdit = useCallback(() => {
    setEditDraft(skillContent?.content ?? '');
    setEditMode(true);
  }, [skillContent]);

  // Detect error state from SWR or from API response
  const effectiveError = useMemo(() => {
    if (skillContentError) {
      return skillContentError instanceof Error ? skillContentError.message : String(skillContentError);
    }
    if (
      skillContent &&
      typeof skillContent === 'object' &&
      'success' in skillContent &&
      (skillContent as Record<string, unknown>).success === false
    ) {
      return ((skillContent as Record<string, unknown>).error as string) || 'Failed to load skill';
    }
    return null;
  }, [skillContentError, skillContent]);

  // Parse frontmatter from the skill content (not from linked files)
  const { frontmatter, body: markdownBody } = useMemo(
    () => stripYamlFrontmatter(skillContent?.content),
    [skillContent?.content],
  );

  // Linked files grouped by category (object keyed by category name)
  const linkedFileCategories = useMemo(() => {
    const lf = skillContent?.linked_files;
    if (!lf || typeof lf !== 'object') return [];
    return Object.entries(lf).filter(([, files]) => Array.isArray(files) && files.length > 0) as [string, string[]][];
  }, [skillContent?.linked_files]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Zap className="w-4 h-4" />
          {t18n('skills.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => {
            setCreateMode(true);
            setSelectedSkill(null);
            setEditMode(false);
            setViewingFile(null);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar list */}
        <div className="w-56 border-r border-[var(--border)] flex flex-col">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                aria-label="Search skills"
                className="w-full pl-6 pr-2 py-1 text-xs bg-transparent border border-[var(--border)] rounded text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {filtered.map(([cat, entries]) => (
              <div key={cat}>
                <button
                  onClick={() => toggleGroup(cat)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)] uppercase hover:text-[var(--text)]"
                >
                  {collapsedGroups.has(cat) ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {cat}
                  <span className="ml-auto text-[10px]">{entries.length}</span>
                </button>
                {!collapsedGroups.has(cat) &&
                  entries.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleSelect(s.name)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors',
                        selectedSkill === s.name && 'bg-[var(--accent-bg)] text-[var(--accent)]',
                        s.disabled && 'opacity-60',
                      )}
                    >
                      <Switch
                        size="sm"
                        checked={!s.disabled}
                        onCheckedChange={(checked) => void handleToggle(s.name, checked)}
                        aria-label={s.disabled ? 'Enable skill' : 'Disable skill'}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{s.name}</span>
                        {s.description && (
                          <span className="block text-[10px] text-[var(--muted)] truncate leading-tight mt-0.5">
                            {s.description}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-xs text-[var(--muted)] text-center">No skills found</div>
            )}
          </div>
        </div>

        {/* Detail area */}
        <div className="flex-1 flex flex-col min-h-0">
          {createMode ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label htmlFor="skill-name" className="text-xs font-medium text-[var(--muted)]">
                  Name
                </label>
                <input
                  id="skill-name"
                  type="text"
                  value={createDraft.name}
                  onChange={(e) =>
                    setCreateDraft((d) => ({
                      ...d,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    }))
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  placeholder="my-skill"
                  aria-label="Skill name"
                />
              </div>
              <div>
                <label htmlFor="skill-category" className="text-xs font-medium text-[var(--muted)]">
                  Category (optional)
                </label>
                <input
                  id="skill-category"
                  type="text"
                  value={createDraft.category}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, category: e.target.value }))}
                  className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  placeholder="coding"
                  aria-label="Skill category"
                />
              </div>
              <div>
                <label htmlFor="skill-content" className="text-xs font-medium text-[var(--muted)]">
                  Content
                </label>
                <textarea
                  id="skill-content"
                  value={createDraft.content}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, content: e.target.value }))}
                  rows={12}
                  className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none resize-none focus:ring-1 focus:ring-[var(--focus-ring)] font-mono"
                  placeholder="---&#10;name: my-skill&#10;---&#10;Skill instructions..."
                  aria-label="Skill content"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void handleSave(createDraft.name, createDraft.category, createDraft.content)}
                  disabled={!createDraft.name.trim()}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreateMode(false);
                    setCreateDraft({ name: '', category: '', content: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : selectedSkill ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
                <span className="text-sm font-medium text-[var(--text)] truncate">{selectedSkill}</span>
                <div className="flex items-center gap-1">
                  {!editMode ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={startEdit}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--error)]"
                        onClick={() => void handleDelete(selectedSkill)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[var(--muted)]"
                      onClick={() => setEditMode(false)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm">
                {/* Error panel when skill fails to load */}
                {effectiveError && !editMode ? (
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--error)] bg-red-500/5">
                    <AlertCircle className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-[var(--error)] text-xs mb-1">Failed to load skill</div>
                      <div className="text-xs text-[var(--muted)]">{effectiveError}</div>
                    </div>
                  </div>
                ) : editMode ? (
                  <div className="space-y-3">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={20}
                      className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none resize-none font-mono focus:ring-1 focus:ring-[var(--focus-ring)]"
                      aria-label="Edit skill content"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void handleSave(selectedSkill, '', editDraft)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {viewingFile ? (
                      /* Viewing a linked file */
                      <>
                        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--muted)]">
                          <button className="hover:text-[var(--text)]" onClick={() => setViewingFile(null)}>
                            &larr; Back to {selectedSkill}
                          </button>
                          <span>/</span>
                          <span className="text-[var(--text)]">{viewingFile}</span>
                        </div>
                        {fileContent !== undefined ? (
                          isMarkdownFile(viewingFile) ? (
                            <MarkdownRenderer content={fileContent.content} />
                          ) : (
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-[var(--text)] bg-[var(--surface)] p-3 rounded border border-[var(--border)] overflow-x-auto">
                              <code>{fileContent.content}</code>
                            </pre>
                          )
                        ) : (
                          <div className="text-[var(--muted)] text-center">Loading...</div>
                        )}
                      </>
                    ) : (
                      /* Viewing the skill itself */
                      <>
                        {/* YAML frontmatter in collapsible details */}
                        {frontmatter && (
                          <details className="mb-4 border border-[var(--border)] rounded">
                            <summary className="px-3 py-2 text-xs font-medium text-[var(--muted)] cursor-pointer hover:text-[var(--text)] select-none">
                              Metadata
                            </summary>
                            <pre className="px-3 py-2 text-xs font-mono text-[var(--text)] border-t border-[var(--border)] overflow-x-auto">
                              <code>{frontmatter}</code>
                            </pre>
                          </details>
                        )}

                        {markdownBody !== undefined ? (
                          <MarkdownRenderer content={markdownBody || '(no content)'} />
                        ) : (
                          <div className="text-[var(--muted)] text-center">Loading...</div>
                        )}

                        {/* Linked files grouped by category */}
                        {linkedFileCategories.length > 0 && (
                          <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
                              Linked Files
                            </div>
                            {linkedFileCategories.map(([cat, files]) => (
                              <div key={cat} className="mb-3">
                                <h4 className="text-xs font-medium text-[var(--text)] mb-1">{cat}</h4>
                                {files.map((f) => (
                                  <button
                                    key={f}
                                    onClick={() => setViewingFile(f)}
                                    className="flex items-center gap-2 w-full text-left px-2 py-1 text-xs rounded hover:bg-[var(--hover-bg)] text-[var(--text)]"
                                  >
                                    <FileText className="w-3 h-3 text-[var(--muted)]" />
                                    {f}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">
              Select a skill to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
