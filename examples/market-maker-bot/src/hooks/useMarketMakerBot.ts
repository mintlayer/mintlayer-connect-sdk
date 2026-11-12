import { useCallback, useEffect, useRef, useState } from 'react';
import type { BotSnapshot, Command, CommandResult } from '../../shared/protocol';

export async function apiRequest<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? { credentials: 'same-origin', signal: AbortSignal.timeout(15_000) }
      : {
          method,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-Bot-Request': '1' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        },
  );
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error ?? `Server returned ${response.status}`), { status: response.status });
  return result as T;
}
export function useMarketMakerBot() {
  const [state, setState] = useState<BotSnapshot | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const active = useRef(true);
  const refreshing = useRef<Promise<void> | null>(null);
  const refresh = useCallback(() => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = apiRequest<BotSnapshot>('/api/state')
      .then((snapshot) => {
        if (active.current) {
          setState(snapshot);
          setAuthenticated(true);
          setConnectionError(null);
        }
      })
      .catch((cause) => {
        if (active.current) {
          setConnectionError(cause.message);
          if (cause.status === 401) setAuthenticated(false);
        }
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, []);
  const login = useCallback(
    async (password: string) => {
      try {
        await apiRequest('/api/session', { password });
        setAuthenticated(true);
        setError(null);
        await refresh();
      } catch (cause) {
        setError((cause as Error).message);
      }
    },
    [refresh],
  );
  useEffect(() => {
    active.current = true;
    void apiRequest<{ authenticated: boolean }>('/api/session')
      .then((session) => {
        if (active.current) {
          setAuthenticated(session.authenticated);
          if (session.authenticated) void refresh();
        }
      })
      .catch((cause) => setError(cause.message));
    return () => {
      active.current = false;
    };
  }, [refresh]);
  useEffect(() => {
    if (!authenticated) return;
    const stream = new EventSource('/api/stream');
    stream.onmessage = () => {
      void refresh();
    };
    stream.onerror = () => {
      if (active.current) setConnectionError('Connection interrupted; reconnecting to the server.');
    };
    stream.onopen = () => {
      setConnectionError(null);
      void refresh();
    };
    const timer = setInterval(() => {
      void refresh();
    }, 15_000);
    return () => {
      stream.close();
      clearInterval(timer);
    };
  }, [authenticated, refresh]);
  const command = useCallback(
    async (command: Command): Promise<CommandResult | null> => {
      setPending((value) => value + 1);
      setError(null);
      try {
        let result = await apiRequest<CommandResult>('/api/commands', { id: crypto.randomUUID(), command });
        const deadline = Date.now() + 120_000;
        while (['queued', 'running'].includes(result.status) && Date.now() < deadline && active.current) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          result = await apiRequest<CommandResult>(`/api/commands/${result.id}`);
        }
        if (result.status === 'failed') throw new Error(result.error ?? 'Command failed');
        if (['queued', 'running'].includes(result.status))
          throw new Error(`Command ${result.id} is still queued; its server record is retained.`);
        await refresh();
        return result;
      } catch (cause) {
        if (active.current) setError((cause as Error).message);
        return null;
      } finally {
        if (active.current) setPending((value) => value - 1);
      }
    },
    [refresh],
  );
  return {
    state,
    authenticated,
    login,
    error: error ?? connectionError,
    connected: !connectionError,
    pending: pending > 0,
    command,
    refresh,
  };
}
