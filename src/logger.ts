export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
let current: LogLevel = 'info';

export function setLogLevel(l: LogLevel): void { current = l; }

function ts(): string { return new Date().toISOString(); }

function out(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[current]) return;
  const m = meta ? ' ' + JSON.stringify(meta) : '';
  const line = `[${ts()}] [${level.toUpperCase()}] ${msg}${m}`;
  if (level === 'warn') console.warn(line);
  else if (level === 'error') console.error(line);
  else console.log(line);
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => out('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => out('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => out('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => out('error', m, meta),
};
