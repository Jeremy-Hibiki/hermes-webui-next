'use client';

import { useState, useCallback } from 'react';
import { getCompletions } from '@/lib/commands';

interface UseCommandsReturn {
  completions: string[];
  selectedCommand: string | null;
  updateInput: (input: string) => void;
  selectCompletion: (cmd: string) => void;
  reset: () => void;
}

export function useCommands(): UseCommandsReturn {
  const [completions, setCompletions] = useState<string[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);

  const updateInput = useCallback((input: string) => {
    setCompletions(getCompletions(input));
    setSelectedCommand(null);
  }, []);

  const selectCompletion = useCallback((cmd: string) => {
    setSelectedCommand(cmd);
    setCompletions([]);
  }, []);

  const reset = useCallback(() => {
    setCompletions([]);
    setSelectedCommand(null);
  }, []);

  return { completions, selectedCommand, updateInput, selectCompletion, reset };
}
