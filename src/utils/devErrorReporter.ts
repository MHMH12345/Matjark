type DevErrorPayload = {
  type: string;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: string;
};

type ReporterWindow = Window & {
  __MATJARK_DEV_ERROR_REPORTER_INSTALLED__?: boolean;
};

const formatConsoleArgs = (args: unknown[]): string => {
  if (args.length === 0) return '';

  const [first, ...remaining] = args;
  if (typeof first !== 'string') {
    return args.map(formatValue).join(' ');
  }

  let argumentIndex = 0;
  const message = first.replace(/%([sdifoOc%])/g, (match, token: string) => {
    if (token === '%') return '%';
    if (argumentIndex >= remaining.length) return match;

    const value = remaining[argumentIndex++];
    if (token === 'd' || token === 'i' || token === 'f') {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return String(value);
      return token === 'f' ? String(numericValue) : String(Math.trunc(numericValue));
    }

    return formatValue(value);
  });

  const extraArguments = remaining.slice(argumentIndex).map(formatValue);
  return [message, ...extraArguments].join(' ');
};

const formatValue = (value: unknown): string => {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';

  try {
    const serialized = JSON.stringify(value);
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
};

export function installDevErrorReporter(): void {
  const reporterWindow = window as ReporterWindow;
  if (reporterWindow.__MATJARK_DEV_ERROR_REPORTER_INSTALLED__) return;
  reporterWindow.__MATJARK_DEV_ERROR_REPORTER_INSTALLED__ = true;

  const recentErrors = new Map<string, number>();
  let reporting = false;

  const send = (payload: Omit<DevErrorPayload, 'timestamp'>): void => {
    const key = `${payload.type}:${payload.message}`;
    const now = Date.now();
    const previous = recentErrors.get(key);
    if (previous !== undefined && now - previous < 900) return;
    recentErrors.set(key, now);

    if (recentErrors.size > 40) {
      for (const [errorKey, time] of recentErrors) {
        if (now - time > 5000) recentErrors.delete(errorKey);
      }
    }

    const completePayload: DevErrorPayload = {
      ...payload,
      timestamp: new Date(now).toLocaleString(),
    };

    void fetch('/__matjark_dev_error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completePayload),
      keepalive: true,
    }).catch(() => {
      // Vite may be restarting; keep the original browser error visible.
    });
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement & { src?: string; href?: string };
      send({
        type: 'Resource Load Error',
        message: `Unable to load ${target.tagName || 'resource'}`,
        source: target.src || target.href || '',
      });
      return;
    }

    send({
      type: 'Uncaught JavaScript Error',
      message: event.message || event.error?.message || 'Unknown JavaScript error',
      stack: event.error instanceof Error ? event.error.stack : '',
      source: event.filename || '',
      line: event.lineno || undefined,
      column: event.colno || undefined,
    });
  }, true);

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    send({
      type: 'Unhandled Promise Rejection',
      message: formatValue(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : '',
    });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: Parameters<typeof console.error>) => {
    originalConsoleError(...args);
    if (reporting) return;

    reporting = true;
    try {
      const error = args.find((value): value is Error => value instanceof Error);
      send({
        type: 'console.error',
        message: formatConsoleArgs(args).slice(0, 8000) || 'console.error called without a message',
        stack: error?.stack,
      });
    } finally {
      reporting = false;
    }
  };

  console.info('[Matjark] Development error reporting is connected to CMD.');
}
