// Core scrape orchestration: run a set of scrapers (in parallel), filter to
// relevant + in-window events, dedupe across all sources, sort, and return the
// kept events plus a per-source run log.
//
// This file is browser-safe (no Node-only imports) so the exact same pipeline
// powers both the Electron desktop app and the hosted web app. The list of
// scrapers is injected by the caller (Node passes the fs-backed Sipoo fixture
// scraper; the web passes a bundled-JSON version).

import type { KidEvent, ScraperRunLog } from '@shared/types';
import { makeLogger } from '../lib/logger.js';
import { eventIsRelevant } from '../lib/relevance.js';
import { isActiveWithin, isOld, helsinkiToday } from '../lib/eventWindow.js';
import { dedupeEvents } from '../lib/dedupe.js';
import type { Scraper, ScrapeContext } from './types.js';

export interface OrchestratorResult {
  events: KidEvent[];
  logs: ScraperRunLog[];
}

export interface RunOptions {
  todayISO?: string;
  windowDays?: number;
}

async function runOne(
  scraper: Scraper,
  todayISO: string,
  windowDays: number,
  log: ReturnType<typeof makeLogger>,
): Promise<{ kept: KidEvent[]; runLog: ScraperRunLog }> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const ctx: ScrapeContext = { todayISO, windowDays, logger: makeLogger(scraper.name) };

  let rawCount = 0;
  let kept: KidEvent[] = [];
  let error: string | null = null;

  try {
    log.info(`source "${scraper.name}" started${scraper.isMock ? ' (fixture/mock)' : ''}`);
    const raw = await scraper.scrape(ctx);
    rawCount = raw.length;
    kept = raw.filter(
      (ev) =>
        !isOld(ev, todayISO) &&
        isActiveWithin(ev, todayISO, windowDays) &&
        // Sources that already filter by child/family audience are trusted;
        // others must pass our keyword-relevance check.
        (scraper.preFiltered || eventIsRelevant(ev)),
    );
    log.info(`source "${scraper.name}": raw=${rawCount}, kept after filtering=${kept.length}`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    log.error(`source "${scraper.name}" failed: ${error}`);
  }

  return {
    kept,
    runLog: {
      sourceName: scraper.name,
      isMock: scraper.isMock,
      rawCount,
      keptCount: kept.length,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - start),
      error,
    },
  };
}

export async function runScrapers(
  scrapers: Scraper[],
  options: RunOptions = {},
): Promise<OrchestratorResult> {
  const todayISO = options.todayISO ?? helsinkiToday();
  const windowDays = options.windowDays ?? 7;
  const log = makeLogger('scrape');

  log.info(`==== Scraper run started (today=${todayISO}, window=${windowDays}d) ====`);

  // Run all sources concurrently — they are independent network calls.
  const results = await Promise.all(scrapers.map((s) => runOne(s, todayISO, windowDays, log)));

  const logs = results.map((r) => r.runLog);
  const allKept = results.flatMap((r) => r.kept);

  const beforeDedup = allKept.length;
  const deduped = dedupeEvents(allKept);
  log.info(
    `deduplication: ${beforeDedup} -> ${deduped.length} (removed ${beforeDedup - deduped.length} duplicates)`,
  );

  // Sort by *effective* start date within the window, then time, then title.
  // Ongoing events that started before today are clamped to today so they
  // interleave with fresh events instead of dominating the top of every tab.
  const effective = (e: KidEvent) => (e.startDate < todayISO ? todayISO : e.startDate);
  deduped.sort((a, b) => {
    const ad = effective(a);
    const bd = effective(b);
    if (ad !== bd) return ad.localeCompare(bd);
    const at = a.startTime ?? '99:99';
    const bt = b.startTime ?? '99:99';
    if (at !== bt) return at.localeCompare(bt);
    return a.title.localeCompare(b.title);
  });

  log.info(`==== Scraper run finished: ${deduped.length} events kept ====`);
  return { events: deduped, logs };
}
