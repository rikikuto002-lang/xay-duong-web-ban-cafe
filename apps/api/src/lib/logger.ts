export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  requestId?: string;
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  error?: Error | unknown;
  [key: string]: unknown;
}

export class Logger {
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const errorDetails = context?.error instanceof Error
      ? {
          name: context.error.name,
          message: context.error.message,
          stack: context.error.stack
        }
      : context?.error;

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...context,
      error: errorDetails
    });
  }

  info(message: string, context?: LogContext) {
    console.log(this.format('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.format('warn', message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.format('error', message, context));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, context));
    }
  }
}

export const logger = new Logger();
