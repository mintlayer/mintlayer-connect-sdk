import Fastify from 'fastify';
import staticFiles from '@fastify/static';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BotRunner } from './runtime';
import { validateTradingConfig, type ServerOptions } from './config';
import type { Command, CommandEnvelope } from '../shared/protocol';

function parseCommand(raw: unknown, network: string): CommandEnvelope {
  if (!raw || typeof raw !== 'object') throw new Error('Missing command');
  const { id, command } = raw as any;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(id) || !command || typeof command !== 'object')
    throw new Error('Invalid command envelope');
  const text = (key: string) => {
    if (typeof command[key] !== 'string' || !command[key] || command[key].length > 500)
      throw new Error(`Invalid ${key}`);
    return command[key] as string;
  };
  let parsed: Command;
  switch (command.kind) {
    case 'start':
    case 'stop':
    case 'sync':
      parsed = { kind: command.kind };
      break;
    case 'mode':
      if (!['observe', 'dry-run', 'live'].includes(command.mode)) throw new Error('Invalid execution mode');
      parsed = { kind: 'mode', mode: command.mode };
      break;
    case 'config':
      if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1)
        throw new Error('Invalid config version');
      parsed = {
        kind: 'config',
        config: validateTradingConfig(command.config, network),
        expectedVersion: command.expectedVersion,
      };
      break;
    case 'execute':
      parsed = { kind: 'execute', actionId: text('actionId') };
      break;
    case 'conclude':
      parsed = { kind: 'conclude', orderId: text('orderId') };
      break;
    case 'abandon-attempt':
      parsed = { kind: 'abandon-attempt', attemptId: text('attemptId') };
      break;
    case 'prepare':
      parsed = { kind: 'prepare', requestId: text('requestId') };
      break;
    case 'manual-order':
      if (!['bid', 'ask'].includes(command.side)) throw new Error('Invalid order side');
      parsed = { kind: 'manual-order', side: command.side };
      break;
    default:
      throw new Error('Unknown command');
  }
  return { id, command: parsed };
}
export function createHttpServer(options: ServerOptions, runner?: BotRunner) {
  const app = Fastify({
    logger: {
      level: process.env.BOT_LOG_LEVEL ?? 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'walletSeed', 'signedHex'],
    },
    bodyLimit: 32_768,
  });
  const sessions = new Map<string, number>();
  const loginAttempts = new Map<string, { at: number; count: number }>();
  const authed = (cookie?: string) =>
    !options.adminPassword ||
    (sessions.get(/(?:^|;\s*)bot_session=([a-f0-9]+)/.exec(cookie ?? '')?.[1] ?? '') ?? 0) > Date.now();
  const digest = (text: string) => createHash('sha256').update(text).digest();
  app.addHook('onRequest', async (request, reply) => {
    let hostname: string;
    try { hostname = new URL(`http://${request.headers.host}`).hostname; }
    catch { return reply.code(403).send({ error: 'Invalid host' }); }
    const allowed = ['0.0.0.0', '::'].includes(options.host)
      ? null
      : new Set(['127.0.0.1', 'localhost', '::1'].includes(options.host)
        ? ['127.0.0.1', 'localhost', '[::1]'] : [options.host]);
    if (allowed && !allowed.has(hostname)) return reply.code(403).send({ error: 'Unexpected host' });
    if (!request.url.startsWith('/api/')) return;
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (request.headers['x-bot-request'] !== '1') return reply.code(403).send({ error: 'Missing request header' });
      const origin = request.headers.origin;
      if (origin) {
        try {
          if (new URL(origin).host !== request.headers.host)
            return reply.code(403).send({ error: 'Cross-origin commands are not allowed' });
        } catch {
          return reply.code(403).send({ error: 'Invalid origin' });
        }
      }
    }
    if (request.url.split('?')[0] !== '/api/session' && !authed(request.headers.cookie))
      return reply.code(401).send({ error: 'Sign in to the bot server' });
    reply.header('Cache-Control', 'no-store');
  });
  app.get('/api/session', async (request) => ({
    authenticated: authed(request.headers.cookie),
    passwordRequired: !!options.adminPassword,
  }));
  app.post('/api/session', async (request, reply) => {
    const password = (request.body as any)?.password;
    const previous = loginAttempts.get(request.ip);
    const attempts = previous && Date.now() - previous.at < 60_000 ? previous : { at: Date.now(), count: 0 };
    attempts.count++;
    if (loginAttempts.size > 256) loginAttempts.clear();
    loginAttempts.set(request.ip, attempts);
    if (attempts.count > 10) return reply.code(429).send({ error: 'Try again in a minute' });
    if (
      options.adminPassword &&
      (typeof password !== 'string' || !timingSafeEqual(digest(password), digest(options.adminPassword)))
    )
      return reply.code(401).send({ error: 'Invalid password' });
    for (const [key, expiry] of sessions) if (expiry < Date.now()) sessions.delete(key);
    if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + 12 * 3_600_000);
    reply.header(
      'Set-Cookie',
      `bot_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.BOT_COOKIE_SECURE === 'true' ? '; Secure' : ''}`,
    );
    return { authenticated: true };
  });
  app.delete('/api/session', async (request, reply) => {
    const token = /(?:^|;\s*)bot_session=([a-f0-9]+)/.exec(request.headers.cookie ?? '')?.[1];
    if (token) sessions.delete(token);
    reply.header('Set-Cookie', 'bot_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return { authenticated: false };
  });
  app.get('/health/live', async () => ({ ok: true }));
  app.get('/health/ready', async (_request, reply) => {
    const state = runner?.snapshot();
    return reply
      .code(state?.runtime.initialized && !state.stale ? 200 : 503)
      .send({
        ready: !!state?.runtime.initialized && !state.stale,
        running: state?.control.running ?? false,
        reason: state?.pauseReason,
      });
  });
  // Bind after construction so logging and the runner share one structured logger.
  const current = () => {
    if (!runner) throw new Error('Runner not attached');
    return runner;
  };
  app.get('/api/state', async () => current().snapshot());
  app.post('/api/commands', async (request, reply) => {
    try {
      const result = current().accept(parseCommand(request.body, options.config.network));
      return reply.code(202).send(result);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid command' });
    }
  });
  app.get<{ Params: { id: string } }>('/api/commands/:id', async (request, reply) => {
    const command = current().db.command(request.params.id);
    return command ?? reply.code(404).send({ error: 'Unknown command' });
  });
  const paging = (query: unknown) => {
    const raw = query as any;
    const limit = Number(raw?.limit ?? 100),
      before = Number(raw?.before ?? Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(before) || before < 1)
      throw new Error('Invalid page');
    return { limit, before };
  };
  app.get('/api/transactions', async (request, reply) => {
    try {
      const { limit, before } = paging(request.query);
      return current().db.history(limit, before);
    } catch {
      return reply.code(400).send({ error: 'Invalid page' });
    }
  });
  app.get('/api/events', async (request, reply) => {
    try {
      const { limit, before } = paging(request.query);
      const events = current().db.events(limit + 1, before);
      return { items: events.slice(0, limit), nextCursor: events.length > limit ? events[limit - 1].id : null };
    } catch {
      return reply.code(400).send({ error: 'Invalid page' });
    }
  });
  const streams = new Set<import('node:http').ServerResponse>();
  app.get('/api/stream', async (request, reply) => {
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    streams.add(response);
    // SSE only invalidates state; snapshot GET is authoritative on reconnect.
    // No database cursor/read transaction is held by a connected browser.
    const send = () => {
      if (response.writableLength > 65_536) return response.destroy();
      response.write(`data: ${JSON.stringify({ revision: current().snapshot().revision })}\n\n`);
    };
    send();
    const unsubscribe = current().subscribe(send);
    const heartbeat = setInterval(() => {
      if (response.writableLength > 65_536) response.destroy();
      else response.write(': heartbeat\n\n');
    }, 15_000);
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      streams.delete(response);
    });
  });
  app.addHook('preClose', async () => {
    for (const stream of streams) stream.end();
  });
  const frontend = resolve(__dirname, '../dist');
  if (existsSync(frontend)) {
    app.register(staticFiles, { root: frontend, cacheControl: false });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith('/api/') || request.url.startsWith('/health/')
        ? reply.code(404).send({ error: 'Not found' })
        : reply.sendFile('index.html'),
    );
  }
  return {
    app,
    attach: (value: BotRunner) => {
      runner = value;
    },
  };
}
