import type { LogLevel } from "./config";

/**
 * Simple structured logger interface that can be replaced with Winston, Pino, etc.
 */
export interface Logger {
  level: LogLevel;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Default console-backed logger implementation.
 */
export class ConsoleLogger implements Logger {
  public level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private shouldLog(target: LogLevel): boolean {
    const ordering: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return ordering[target] <= ordering[this.level];
  }

  public debug(message: string, meta: Record<string, unknown> = {}): void {
    if (this.shouldLog("debug")) {
      console.debug(JSON.stringify({ level: "debug", message, ...meta }));
    }
  }

  public info(message: string, meta: Record<string, unknown> = {}): void {
    if (this.shouldLog("info")) {
      console.info(JSON.stringify({ level: "info", message, ...meta }));
    }
  }

  public warn(message: string, meta: Record<string, unknown> = {}): void {
    if (this.shouldLog("warn")) {
      console.warn(JSON.stringify({ level: "warn", message, ...meta }));
    }
  }

  public error(message: string, meta: Record<string, unknown> = {}): void {
    if (this.shouldLog("error")) {
      console.error(JSON.stringify({ level: "error", message, ...meta }));
    }
  }
}
