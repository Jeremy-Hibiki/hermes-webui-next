# Style Difference Report: Original vs Next.js Reimplementation

> Auto-generated comparison of `hermes-webui/static/style.css` + `ui.js` vs
> `hermes-webui-next/src/` Tailwind components.

---

## 1. Layout Shell

| Property                  | Original                                                                                            | Next.js                                        | File                          |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| Sidebar width             | `300px`                                                                                             | `w-64` (256px)                                 | `sidebar.tsx`                 |
| Sidebar transition        | `width .24s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .24s cubic-bezier(.22,1,.36,1)` | None                                           | `sidebar.tsx`                 |
| Sidebar bg                | `var(--sidebar)`                                                                                    | `bg-[var(--sidebar)]`                          | OK                            |
| Sidebar border            | `border-right: 1px solid var(--border)`                                                             | `border-r border-[var(--border)]`              | OK                            |
| Rightpanel width          | `300px`                                                                                             | `w-80` (320px)                                 | `workspace-panel.tsx`         |
| Rightpanel transition     | `width .24s cubic-bezier(.22,1,.36,1), opacity .18s, transform .24s cubic-bezier(.22,1,.36,1)`      | None                                           | `workspace-panel.tsx`         |
| Rightpanel container-type | `container-type:inline-size; container-name:rightpanel`                                             | None                                           | Missing                       |
| Main area                 | `flex:1; flex-direction:column; overflow:hidden; min-width:0; background:var(--main-bg)`            | `flex-1 flex flex-col overflow-hidden min-w-0` | Missing `bg-[var(--main-bg)]` |
| Rail width                | `48px`                                                                                              | `w-12` (48px)                                  | OK                            |
| Rail btn size             | `36x36px, border-radius:8px`                                                                        | `w-9 h-9 rounded-lg` (36px, 8px)               | OK                            |
| Rail active indicator     | `::before left:-6px, width:3px, height:16px, border-radius:0 2px 2px 0`                             | Missing                                        | `rail-nav.tsx`                |
| App titlebar              | Present (height ~38px, blur backdrop)                                                               | Missing entirely                               | `page.tsx`                    |
| Resize handles            | Present (3px wide, cursor col-resize, hover accent)                                                 | Missing                                        | All panels                    |

## 2. Sidebar Details

| Property                        | Original                                                                                                                 | Next.js                           | File          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------- |
| Sidebar header padding          | `16px 18px 14px`                                                                                                         | `p-4` (16px all)                  | `sidebar.tsx` |
| Sidebar header border           | `border-bottom: 1px solid var(--border)`                                                                                 | `border-b border-[var(--border)]` | OK            |
| Logo                            | `32x32px, border-radius:9px, gradient bg, box-shadow`                                                                    | Simplified                        | `sidebar.tsx` |
| Logo gradient                   | `linear-gradient(145deg, var(--accent-hover), var(--accent))`                                                            | Missing                           | `sidebar.tsx` |
| Logo shadow                     | `box-shadow:0 2px 8px var(--accent-bg-strong)`                                                                           | Missing                           | `sidebar.tsx` |
| New chat button                 | `width:100%, padding:9px 12px, border-radius:9px, background:var(--accent-bg), border:1px solid var(--accent-bg-strong)` | Simplified                        | `sidebar.tsx` |
| New chat button hover           | `background:var(--accent-bg-strong); border-color:var(--accent)`                                                         | Simplified                        | `sidebar.tsx` |
| Session list padding            | `0 8px 8px`                                                                                                              | `p-2` (8px all)                   | `sidebar.tsx` |
| Session item padding            | `8px 8px`                                                                                                                | `p-2` (8px all)                   | OK            |
| Session item border-radius      | `8px`                                                                                                                    | `rounded-lg` (8px)                | OK            |
| Session item alignment          | `align-items:flex-start`                                                                                                 | `items-center`                    | **Wrong**     |
| Session item active bg          | `var(--accent-bg)`                                                                                                       | `var(--accent-bg)`                | OK            |
| Session item active title color | `var(--accent-text)`                                                                                                     | Default text                      | `sidebar.tsx` |
| Session search input            | `padding:7px 10px 7px 32px, border-radius:8px`                                                                           | Simplified                        | `sidebar.tsx` |
| Session search focus            | `border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-bg)`                                                      | Missing                           | `sidebar.tsx` |
| Sidebar collapse animation      | `cubic-bezier(.22,1,.36,1), translateX(-14px)`                                                                           | None                              | Missing       |

## 3. Chat Messages

| Property               | Original                                         | Next.js                 | File              |
| ---------------------- | ------------------------------------------------ | ----------------------- | ----------------- |
| Message row padding    | `padding:12px 0`                                 | Varies                  | `main-panel.tsx`  |
| Message body padding   | `padding-left:var(--msg-rail); padding-top:8px`  | Simplified              | `main-panel.tsx`  |
| Message max-width      | `var(--msg-max)` (720px)                         | Not applied             | Missing           |
| Assistant msg bg       | `transparent`                                    | `bg-[var(--surface)]`   | **Wrong**         |
| User msg bg            | `var(--accent-bg)` with border                   | `bg-[var(--accent-bg)]` | OK but simplified |
| User msg border-radius | `12px`                                           | `rounded-xl` (12px)     | OK                |
| Stream fade animation  | `@keyframes stream-fade-word`                    | Missing                 | `main-panel.tsx`  |
| Message timestamps     | Present (per-message)                            | Missing                 | `main-panel.tsx`  |
| TPS counter            | Present                                          | Missing                 | `main-panel.tsx`  |
| Token usage display    | Present                                          | Missing                 | `main-panel.tsx`  |
| Code block header      | `.pre-header` with language label + copy button  | Missing                 | `main-panel.tsx`  |
| Code diff viewer       | `.diff-block` with +/- coloring                  | Missing                 | `main-panel.tsx`  |
| JSON tree viewer       | `.tree-key/.tree-str/.tree-num`                  | Missing                 | `main-panel.tsx`  |
| Message role icons     | `.role-icon` with `border-radius:50%`            | Simplified              | `main-panel.tsx`  |
| Tool cards             | Full tool-card system with running dot animation | Simplified              | `main-panel.tsx`  |

## 4. Composer

| Property               | Original                                                                  | Next.js               | File                  |
| ---------------------- | ------------------------------------------------------------------------- | --------------------- | --------------------- |
| Composer wrap padding  | `10px 20px 14px`                                                          | `p-4` (16px all)      | `composer-footer.tsx` |
| Composer wrap gradient | `::before linear-gradient(to bottom, transparent, var(--bg))` height:32px | Missing               | `composer-footer.tsx` |
| Composer box           | `border-radius:16px, border:1px solid var(--border2)`                     | Simplified            | `composer-footer.tsx` |
| Composer box focus     | `border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-bg)`       | Missing               | `composer-footer.tsx` |
| Send button shape      | `border-radius:50%` (circle)                                              | Square/rounded        | `composer-footer.tsx` |
| Send button animation  | `@keyframes send-pop-in`                                                  | Missing               | `composer-footer.tsx` |
| Context ring           | SVG ring showing context usage                                            | Missing               | `composer-footer.tsx` |
| Reasoning selector     | Chip in composer footer                                                   | Missing               | `composer-footer.tsx` |
| Suggestions            | `.suggestion` with `border-radius:10px`                                   | Simplified or missing | `main-panel.tsx`      |

## 5. Workspace Panel

| Property            | Original                                                                                            | Next.js                          | File                     |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| Panel header        | `padding:12px 16px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.1em` | Simplified                       | `workspace-panel.tsx`    |
| Panel header grid   | `grid-template-columns:minmax(0,1fr) auto`                                                          | Flex                             | Different layout         |
| File tree padding   | `8px`                                                                                               | `p-2` (8px)                      | OK                       |
| File item           | `padding:6px 10px; border-radius:8px; font-size:12px`                                               | Simplified                       | `file-tree.tsx`          |
| File item active    | `background:var(--accent-bg); color:var(--accent-text)`                                             | Simplified                       | `file-tree.tsx`          |
| File item dragging  | `opacity:.35; border:1px dashed var(--accent-bg-strong)`                                            | Missing                          | `file-tree.tsx`          |
| File item drag-over | `background:var(--accent-bg); color:var(--accent-text); outline:1px solid var(--accent-bg-strong)`  | Missing                          | `file-tree.tsx`          |
| Breadcrumb          | `.breadcrumb-link:hover` with bg                                                                    | Simplified                       | `file-tree.tsx`          |
| File preview area   | `padding:14px; transition:opacity .15s`                                                             | Simplified                       | `file-preview.tsx`       |
| Tab bar             | Not present (single view)                                                                           | Tab bar with Files/Artifacts/Git | Extra UI not in original |
| Git badge           | `.git-badge` with `font-size:9px; font-weight:600; border-radius:4px`                               | Simplified                       | `git-badge.tsx`          |

## 6. Terminal

| Property                    | Original                                                                             | Next.js                       | File           |
| --------------------------- | ------------------------------------------------------------------------------------ | ----------------------------- | -------------- |
| Terminal dock position      | `position:absolute; bottom:0; left:20px; right:20px; max-width:var(--msg-max,720px)` | Missing dock layout           | `terminal.tsx` |
| Terminal dock blur          | `backdrop-filter:blur(16px)`                                                         | Missing                       | `terminal.tsx` |
| Terminal dock shadow        | `box-shadow:0 -6px 32px rgba(0,0,0,.35)`                                             | Missing                       | `terminal.tsx` |
| Terminal dock border-radius | `border-radius:14px 14px 0 0`                                                        | Missing                       | `terminal.tsx` |
| Terminal dock animation     | `transform .4s cubic-bezier(.32,.72,.16,1)`                                          | Missing                       | `terminal.tsx` |
| Terminal collapsed height   | `72px` (dock mode)                                                                   | Not implemented               | `terminal.tsx` |
| Terminal header bar         | `padding:9px 14px; border-bottom:1px solid var(--border)`                            | Simplified                    | `terminal.tsx` |
| Terminal font               | `font-family:"SF Mono",ui-monospace,monospace`                                       | `fontFamily` in xterm options | OK             |

## 7. Kanban Board

| Property             | Original                                               | Next.js                 | File               |
| -------------------- | ------------------------------------------------------ | ----------------------- | ------------------ |
| Board padding        | `padding:16px`                                         | `p-4` (16px)            | OK                 |
| Column min/max width | `min-width:260px; max-width:320px; flex:1`             | `w-56` (220px fixed)    | **Wrong**          |
| Column border-radius | `border-radius:10px`                                   | `rounded-lg` (8px)      | Close              |
| Column background    | `var(--panel)`                                         | `bg-[var(--surface)]`   | May differ         |
| Column body gap      | `8px`                                                  | `gap-2` (8px)           | OK                 |
| Column body padding  | `10px`                                                 | `p-2.5` (10px)          | OK                 |
| Card border-radius   | `border-radius:9px`                                    | `rounded-lg` (8px)      | Close              |
| Card padding         | `10px`                                                 | `p-2.5` (10px)          | OK                 |
| Card shadow          | `box-shadow:var(--shadow-sm)`                          | Missing                 | `kanban-board.tsx` |
| Card title font-size | `13px; font-weight:650`                                | `text-sm font-semibold` | OK                 |
| Card body clamp      | `-webkit-line-clamp:3`                                 | Missing                 | `kanban-board.tsx` |
| Card hover border    | `border-color:var(--accent)`                           | OK                      | `kanban-board.tsx` |
| Column drop target   | `outline:2px solid var(--accent); outline-offset:-2px` | Simplified              | `kanban-board.tsx` |
| Mobile columns       | `min-width:82vw; scroll-snap-align:start`              | Missing                 | `kanban-board.tsx` |
| Card meta badges     | Full badge system                                      | Simplified              | `kanban-board.tsx` |
| Card assignee        | `.kanban-card-assignee`                                | Missing                 | `kanban-board.tsx` |

## 8. Settings Panel

| Property             | Original                                                                         | Next.js                     | File                 |
| -------------------- | -------------------------------------------------------------------------------- | --------------------------- | -------------------- |
| Main container       | `padding:24px; max-width:768px; margin:0 auto`                                   | Missing max-width centering | `settings-panel.tsx` |
| Section header       | `margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid var(--border)` | Simplified                  | `settings-panel.tsx` |
| Section title        | `font-size:18px; font-weight:600; letter-spacing:-.01em`                         | Simplified                  | `settings-panel.tsx` |
| Section subtitle     | `font-size:13px; color:var(--muted); line-height:1.55`                           | Simplified                  | `settings-panel.tsx` |
| Settings cards       | `.settings-card` with specific styles                                            | Simplified                  | `settings-panel.tsx` |
| Theme picker buttons | `.theme-pick-btn` with active states                                             | Simplified                  | `theme-switcher.tsx` |
| Skin picker buttons  | `.skin-pick-btn` with active states                                              | Simplified                  | `skin-picker.tsx`    |
| Side menu            | `.side-menu-item` with active indicator                                          | Missing                     | `settings-panel.tsx` |
| Font size selector   | `data-font-size` attribute + CSS                                                 | Missing                     | `settings-panel.tsx` |

## 9. Skills Panel

| Property            | Original                  | Next.js       | File               |
| ------------------- | ------------------------- | ------------- | ------------------ |
| Skill toggle        | iOS-style toggle switch   | Dot indicator | **Wrong**          |
| Skill item layout   | Full row with description | Simplified    | `skills-panel.tsx` |
| Skill running state | Animated indicator        | Missing       | `skills-panel.tsx` |

## 10. Insights Panel

| Property        | Original                                 | Next.js         | File                 |
| --------------- | ---------------------------------------- | --------------- | -------------------- |
| Chart type      | Vertical bar chart (per-token-type bars) | Horizontal bars | **Wrong**            |
| Chart colors    | Uses accent/blue/gold/warning CSS vars   | Simplified      | `insights-panel.tsx` |
| Token breakdown | Multi-segment stacked bars               | Simplified      | `insights-panel.tsx` |

## 11. Mobile Layout

| Property               | Original                                                                         | Next.js               | File    |
| ---------------------- | -------------------------------------------------------------------------------- | --------------------- | ------- |
| Bottom nav height      | `h-14` (56px)                                                                    | `h-14`                | OK      |
| Bottom nav bg          | `var(--sidebar)`                                                                 | `bg-[var(--sidebar)]` | OK      |
| Bottom nav safe-area   | `safe-area-bottom` class                                                         | `safe-area-bottom`    | OK      |
| Sidebar mobile         | `position:fixed; left:-320px; width:min(320px,100vw); transition:left .25s ease` | Not implemented       | Missing |
| Sidebar mobile open    | `left:0` with overlay                                                            | Not implemented       | Missing |
| Mobile overlay         | `position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:199`                | Not implemented       | Missing |
| Rightpanel mobile      | `position:fixed; right:calc(-300px); transition:right .25s ease`                 | Not implemented       | Missing |
| Rightpanel mobile open | `right:0; box-shadow:-4px 0 24px rgba(0,0,0,.4)`                                 | Not implemented       | Missing |
| Body padding-bottom    | `pb-14` for bottom nav                                                           | `pb-14`               | OK      |
| Mobile nav items       | 5 items (Chat, Tasks, Files, Terminal, Settings)                                 | Same 5 items          | OK      |

## 12. Onboarding

| Property           | Original                                                                 | Next.js              | File      |
| ------------------ | ------------------------------------------------------------------------ | -------------------- | --------- |
| Card width         | `min(980px, 100%)`                                                       | `max-w-lg` (512px)   | **Wrong** |
| Card max-height    | `min(760px, 94vh)`                                                       | Not set              | Missing   |
| Card border-radius | `border-radius:24px`                                                     | `rounded-2xl` (16px) | **Wrong** |
| Layout             | `grid-template-columns:minmax(240px,300px) minmax(0,1fr)` (sidebar+main) | Single column        | **Wrong** |
| Onboarding sidebar | Separate sidebar with steps                                              | Missing              | Missing   |
| Step indicators    | `.onboarding-step` with active/done states                               | Missing              | Missing   |
| OAuth card         | Present                                                                  | Missing              | Missing   |
| Connection probe   | `.onboarding-probe-btn` + status banner                                  | Missing              | Missing   |

## 13. Login Page

| Property                 | Original      | Next.js              | File             |
| ------------------------ | ------------- | -------------------- | ---------------- |
| Login card width         | `320px`       | `w-96` (384px)       | **Wrong**        |
| Login card border-radius | `18px`        | `rounded-2xl` (16px) | Close            |
| Login background         | Full gradient | Simplified           | `login-page.tsx` |
| Passkey button           | Present       | Missing              | `login-page.tsx` |

## 14. General / Theme

| Property                   | Original                                                              | Next.js                 | File          |
| -------------------------- | --------------------------------------------------------------------- | ----------------------- | ------------- |
| CSS custom properties      | 40+ vars (--bg, --sidebar, --border, --text, --muted, --accent, etc.) | Migrated to globals.css | OK            |
| Dark mode                  | `:root.dark` selector                                                 | `.dark` class on html   | OK            |
| 12+ skin variants          | Full palette overrides per skin                                       | Migrated to globals.css | OK            |
| Scrollbar styling          | Custom 4px scrollbar                                                  | Default browser         | Missing       |
| Custom tooltips            | `.has-tooltip` system with `data-tooltip`                             | Native title attr       | Missing       |
| Font size preference       | `data-font-size` attribute                                            | Missing                 | Missing       |
| Animations (reduce motion) | `@media(prefers-reduced-motion:reduce)`                               | Partially present       | `globals.css` |
| Toast notifications        | Custom `.toast` system                                                | shadcn Sonner/toast     | Different     |

---

## Priority Fixes (High Impact)

### P0 - Layout Dimensions

1. **Sidebar width**: Change from `w-64` to `w-[300px]` with cubic-bezier transition
2. **Workspace panel width**: Change from `w-80` to `w-[300px]` with cubic-bezier transition
3. **Rail active indicator**: Add `::before` pseudo-element (3px x 16px bar, left:-6px)
4. **Resize handles**: Add 3px-wide drag handles between sidebar/main and main/workspace

### P1 - Visual Fidelity

5. **Assistant message background**: Remove background (should be transparent)
6. **Session item alignment**: Change from `items-center` to `items-start` (flex-start)
7. **Session default color**: Use `var(--muted)` not `var(--text)` for inactive sessions
8. **Composer gradient mask**: Add `::before` pseudo with gradient fade
9. **Send button**: Make circular (`rounded-full`)
10. **Sidebar collapse animation**: Add `cubic-bezier(.22,1,.36,1)` transition
11. **Logo**: Add gradient background and box-shadow
12. **Kanban column widths**: Change from `w-56` to `min-w-[260px] max-w-[320px] flex-1`
13. **Settings max-width**: Add `max-w-[768px] mx-auto`

### P2 - Missing Features

14. **Mobile sidebar slide-in**: Fixed overlay with `left:-320px` animation
15. **Mobile workspace slide-over**: Fixed overlay from right
16. **Message timestamps**: Per-message timestamp display
17. **Code block headers**: Language label + copy button
18. **Custom scrollbar**: 4px thin scrollbar matching theme
19. **Custom tooltips**: `data-tooltip` system replacing native title
20. **App titlebar**: Top bar with app name, model info, window controls

### P3 - Missing Transitions & Animations

21. **Composer box**: Add `max-width:clamp(780px, 60vw, 1100px); border-radius:16px; border:1px solid var(--border2)`
22. **Composer textarea**: `font-size:16px; line-height:1.65; padding:12px 16px 6px; min-height:44px; max-height:200px`
23. **Send button**: `border-radius:50%; box-shadow:0 2px 8px var(--accent-bg-strong)` with `send-pop-in` animation
24. **Icon buttons**: `width:34px; height:34px; border-radius:8px; opacity:.75; transition:all .15s`
25. **Context ring**: SVG `stroke-width:3; stroke-dasharray:61.26; transition:stroke-dashoffset .45s ease`
26. **Messages padding**: `padding:20px 24px 32px` with `max-width:1100px` at 1400px viewport
27. **Empty state logo**: `width:64px; height:64px; border-radius:20px; font-size:28px; box-shadow:0 4px 20px`
28. **Thinking dots**: `width:6px; height:6px; border-radius:50%; animation:pulse 1.4s ease-in-out infinite` with .22s/.44s delay
29. **Suggestions**: `padding:12px 14px; border-radius:10px; font-size:13px; max-width:380px; gap:8px`
30. **Tool cards**: `.tool-card` system with running dot `width:7px; animation:wlpulse 1.3s`
31. **File tree delete button**: `width:0 → 16px on hover; opacity:0 → 1; transition:width .12s`
32. **File size**: `font-size:10px; font-variant-numeric:tabular-nums; margin-left:4px`
33. **File icon**: `font-size:13px; opacity:.7`

### P4 - Polish

21. **Tool cards**: Full tool-card system with running dot animation
22. **Onboarding**: Full two-column layout with step sidebar
23. **Context ring**: SVG context usage indicator in composer
24. **Stream fade animation**: Per-word fade-in during streaming
25. **Kanban mobile snap**: `scroll-snap-type:x mandatory` + `min-width:82vw`
26. **Insights chart**: Vertical bar chart matching original
27. **Skills toggle**: iOS-style toggle switches
28. **File tree drag states**: Active/dragging/drag-over visual states
29. **Terminal dock**: Bottom-anchored floating terminal with blur/shadow
30. **Font size preference**: `data-font-size` attribute + CSS scaling

---

## 15. Architecture (CRITICAL - FIXED)

| Aspect            | Original                                               | Next.js (Before Fix)             | Status    |
| ----------------- | ------------------------------------------------------ | -------------------------------- | --------- |
| Panel location    | All panels inside `.sidebar` as `.panel-view` elements | All panels in `.main` area       | **FIXED** |
| Main area         | Always shows `#mainChat` only                          | Switched between chat and panels | **FIXED** |
| Sidebar content   | Switches between session list (chat) and panel views   | Always showed session list       | **FIXED** |
| Collapse behavior | Clicking active rail button collapses sidebar          | No collapse behavior             | **FIXED** |

> Fix: Created `SidebarContent` component that routes panel content to sidebar. `page.tsx` now always renders `MainPanel` in main. Rail toggle collapses sidebar via `sidebarCollapsedAtom`.

---

## 16. Panel Content Completeness

### Settings Panel (~20% complete)

Missing 26+ preference controls:

- Auxiliary Models sub-section
- Hide new-chat suggestions
- Language selector (i18n)
- RTL chat layout
- Notification sound
- TTS enabled/auto-read/voice mode/raw audio (4 checkboxes)
- TTS Engine/Voice/Rate/Pitch (4 controls)
- Browser notifications
- Show token usage, Provider quota chip, Show TPS
- Fade text effect, Compact tool activity
- Auto-expand terminal, API redact
- Sidebar density, Pinned sessions limit
- Adaptive title refresh, Busy input mode
- Show non-WebUI/cron/previous messaging sessions (3 checkboxes)
- Sync usage to insights
- Check for updates/Ignore updates/Summarize What's New (3 checkboxes)
- Default assistant name
- API key management per provider
- Provider quota card (credit balance, rate limits)
- Plugin version/hooks/activation state badges

### Kanban Board (~30% complete)

Missing major features:

- Multi-board system (board switcher, create/rename/archive)
- Task detail panel (comments, events, links, runs, worker log)
- Sidebar filter stack (assignee, tenant, archived, only mine)
- Dispatcher actions (nudge + run)
- SSE real-time updates (falls back to 30s polling)
- Bulk operations (multi-select + status change)
- Profile swimlanes
- Card staleness indicators
- Quick action buttons (complete/archive)
- Stats bar
- New task quick-create row
- Read-only mode indicator
- Markdown rendering in task descriptions

### Insights Panel (~60% complete)

Missing:

- System Health panel (CPU/RAM/Disk bars)
- LLM Wiki Status card
- Vertical bar chart for daily tokens (using horizontal bars instead)
- Long-range date bucketing (31-90d, 91-180d, 181-365d)
- Cost precision (4 decimal places for costs < $1)
- Overview card icons
- Side-by-side token breakdown + models layout
- Footer with period info

### Skills Panel (~85% complete)

Missing:

- YAML frontmatter parsing and collapsible display
- File type-aware rendering (markdown vs code)
- Error rendering for individual skills
- Linked files categorization with section headers
- Breadcrumb navigation
- Syntax highlighting
- Toast notifications on save

### Memory Panel (~60% complete)

Missing:

- Entire External Notes subsystem:
  - Source listing with status badges
  - Source selector dropdown
  - Search functionality
  - Note preview
  - Recent AI notes
  - Auto-recall hint
  - Tool listing per source

### Cron/Tasks Panel (~45% complete)

Missing:

- Master/detail layout
- Rich cron status system (6 states)
- Attention/warning banners
- Gateway notice
- Skill picker for cron jobs
- No-agent mode / script support
- Duplicate job
- Copy diagnostics
- Run output content loading with expand/collapse
- Usage strip (token counts, estimated cost)
- Running job indicator/watcher with live timer
- Polling / unread badge
- Schedule validation and warnings
- Schedule display (human-readable)

### Workspaces Panel (~35% complete)

Missing:

- Master/detail layout
- Workspace rename
- Path auto-suggestions with keyboard navigation
- Drag-and-drop reorder
- Activate workspace from panel
- Checkpoint viewing
- Workspace dropdown in composer

### Profiles Panel (~75% complete)

Missing:

- Model select with provider groups (optgroup)
- Profile switch side effects (session lifecycle, model state, settings sync)
- Concept help card
- Profile dropdown in topbar
- Detailed error messages

### Logs Panel (~90% complete)

Missing:

- File selector as fixed options (agent/errors/gateway)
- Wrap lines toggle
- Log status bar (line count, bytes, last modified)
- Truncated hint
- TRACEBACK severity detection
