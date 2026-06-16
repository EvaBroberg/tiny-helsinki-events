// Tiny structured logger. Logs go to stdout (visible in the terminal running the
// app) and are also buffered so the renderer can show them in the debug panel.

type Level = 'info' | 'warn' | 'error';

export interface LogLine {
  ts: string;
  level: Level;
  scope: string;
  message: string;
}

const buffer: LogLine[] = [];
const MAX_BUFFER = 500;

function emit(level: Level, scope: string, message: string) {
  const line: LogLine = { ts: new Date().toISOString(), level, scope, message };
  buffer.push(line);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  const tag = `[${line.ts}] [${scope}]`;
  if (level === 'error') console.error(tag, message);
  else if (level === 'warn') console.warn(tag, message);
  else console.log(tag, message);
}

export function makeLogger(scope: string) {
  return {
    info: (msg: string) => emit('info', scope, msg),
    warn: (msg: string) => emit('warn', scope, msg),
    error: (msg: string) => emit('error', scope, msg),
  };
}

export function getRecentLogs(): LogLine[] {
  return [...buffer];
}
