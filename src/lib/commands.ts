export const COMMANDS = [
  'help',
  'model',
  'provider',
  'profile',
  'rename',
  'delete',
  'clear',
  'pin',
  'archive',
  'branch',
  'export',
  'compact',
  'theme',
  'skin',
  'font',
  'workspace',
  'skills',
  'cron',
  'memory',
  'terminal',
  'voice',
  'settings',
  'yo',
  'stop',
  'cost',
  'image',
  'code',
  'bg',
] as const;

export type CommandName = (typeof COMMANDS)[number];

export interface ParsedCommand {
  name: CommandName | string;
  args: string[];
}

export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.slice(1).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  return {
    name: parts[0].toLowerCase(),
    args: parts.slice(1),
  };
}

export function getCompletions(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return [];
  if (trimmed === '/') return [...COMMANDS];

  const partial = trimmed.slice(1).toLowerCase();
  return COMMANDS.filter((cmd) => cmd.startsWith(partial));
}
