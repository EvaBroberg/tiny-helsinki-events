import type { KidEvent } from '@shared/types';

export interface ScrapeLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

export interface ScrapeContext {
  /** Today in Europe/Helsinki, YYYY-MM-DD. */
  todayISO: string;
  /** How many days ahead to look (default 7). */
  windowDays: number;
  logger: ScrapeLogger;
}

export interface Scraper {
  /** Human-readable source name shown in the UI / debug panel. */
  name: string;
  /** true when this scraper returns fixture/mock data instead of live data. */
  isMock: boolean;
  /**
   * Fetch + normalize events. Returns normalized KidEvents WITHOUT relevance /
   * window filtering or dedup — the orchestrator applies those across all
   * sources. May throw; the orchestrator catches and records the error.
   */
  scrape(ctx: ScrapeContext): Promise<KidEvent[]>;
}
