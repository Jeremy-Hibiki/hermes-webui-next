import type { Message, ToolCall } from '@/types';
import { extractTextContent } from '@/types/message';

export function normalizeSessionMessages(raw: Message[], sessionToolCalls: unknown[] = []): Message[] {
  return raw
    .filter((m) => {
      if (!m || typeof m !== 'object') return false;
      const role = m.role;
      if (role === 'tool' || role === 'system') return false;
      const text = extractTextContent(m.content);
      return (
        text.length > 0 ||
        (Array.isArray(m.content) && m.content.length > 0) ||
        (m.tool_calls && m.tool_calls.length > 0)
      );
    })
    .map((m, i) => {
      const msg: Message = { ...m, id: m.id || `msg-${i}` };

      // Normalize OpenAI-format tool_calls: {id, function:{name,arguments}}
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 && (msg.tool_calls as any[])[0]?.function) {
        msg.tool_calls = (msg.tool_calls as any[]).map((tc: any) => ({
          id: tc.id,
          name: tc.function?.name || tc.name,
          arguments:
            typeof tc.function?.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments ?? {}),
        }));
      }

      // Inject session-level tool_calls onto matching assistant messages
      if (msg.role === 'assistant' && (!msg.tool_calls || msg.tool_calls.length === 0) && sessionToolCalls.length > 0) {
        const matching = sessionToolCalls.filter((tc: any) => tc.assistant_msg_idx === i);
        if (matching.length > 0) {
          msg.tool_calls = matching.map((tc: any) => ({
            tid: tc.tid,
            id: tc.tid || tc.id,
            name: tc.name,
            args: tc.args,
            snippet: tc.snippet,
            preview: tc.preview,
            done: tc.done,
            is_error: tc.is_error,
            duration: tc.duration,
          })) as ToolCall[];
        }
      }

      return msg;
    });
}
