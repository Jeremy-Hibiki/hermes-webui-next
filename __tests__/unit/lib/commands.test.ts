import { describe, it, expect } from 'vite-plus/test';
import { parseCommand, getCompletions } from '@/lib/commands';

describe('parseCommand', () => {
  it('parses a simple command', () => {
    const result = parseCommand('/help');
    expect(result).toEqual({ name: 'help', args: [] });
  });

  it('parses command with arguments', () => {
    const result = parseCommand('/model gpt-4');
    expect(result).toEqual({ name: 'model', args: ['gpt-4'] });
  });

  it('parses command with multiple arguments', () => {
    const result = parseCommand('/rename My New Title');
    expect(result).toEqual({ name: 'rename', args: ['My', 'New', 'Title'] });
  });

  it('returns null for non-command input', () => {
    const result = parseCommand('hello world');
    expect(result).toBeNull();
  });

  it('handles extra whitespace', () => {
    const result = parseCommand('/model   gpt-4  ');
    expect(result).toEqual({ name: 'model', args: ['gpt-4'] });
  });

  it('handles command with no slash', () => {
    const result = parseCommand('help');
    expect(result).toBeNull();
  });
});

describe('getCompletions', () => {
  it('returns matching commands for partial input', () => {
    const results = getCompletions('/mo');
    expect(results).toContain('model');
    expect(results).not.toContain('help');
  });

  it('returns empty array for non-slash input', () => {
    const results = getCompletions('hello');
    expect(results).toEqual([]);
  });

  it('returns all commands for just slash', () => {
    const results = getCompletions('/');
    expect(results.length).toBeGreaterThan(10);
  });

  it('is case-insensitive', () => {
    const results = getCompletions('/HEL');
    expect(results).toContain('help');
  });
});
