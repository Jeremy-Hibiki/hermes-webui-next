type EventHandler = (data: unknown) => void;

interface ParsedEvent {
  event: string;
  data: unknown;
  id?: string;
}

export class SSEClient {
  private es: EventSource | null = null;

  connect(url: string, handlers: Record<string, EventHandler>): void {
    this.close();
    this.es = new EventSource(url, { withCredentials: true });

    Object.entries(handlers).forEach(([event, handler]) => {
      this.es!.addEventListener(event, (e: MessageEvent) => {
        try {
          const data = e.data ? JSON.parse(e.data) : {};
          handler(data);
        } catch {
          handler(e.data);
        }
      });
    });

    this.es.onerror = () => {
      // EventSource auto-reconnects
    };
  }

  close(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  get isConnected(): boolean {
    return this.es !== null && this.es.readyState !== EventSource.CLOSED;
  }

  static parseSSEChunk(raw: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const chunks = raw.split('\n\n').filter(Boolean);

    for (const chunk of chunks) {
      let event = 'message';
      let dataStr = '';
      let id: string | undefined;

      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) {
          event = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataStr = line.slice(6);
        } else if (line.startsWith('id: ')) {
          id = line.slice(4).trim();
        }
      }

      try {
        const data = dataStr ? JSON.parse(dataStr) : {};
        events.push({ event, data, id });
      } catch {
        events.push({ event, data: dataStr, id });
      }
    }

    return events;
  }
}
