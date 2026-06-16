// Web data layer. Runs the SAME scraper pipeline as the desktop app, but
// entirely client-side in the browser (the Linked Events API sends
// `Access-Control-Allow-Origin: *`, so the browser can call it directly — no
// backend needed). Results are cached in localStorage so reopening the page is
// instant while fresh data loads in the background.

import type { RefreshResult } from '@shared/types';
import { runScrapers } from '../main/scrapers/runner.js';
import { helsinkiScraper } from '../main/scrapers/helsinki.js';
import { espooScraper } from '../main/scrapers/espoo.js';
import { vantaaScraper } from '../main/scrapers/vantaa.js';
import { sipooScraper } from '../main/scrapers/sipoo.js';

const WEB_SCRAPERS = [helsinkiScraper, espooScraper, vantaaScraper, sipooScraper];

const CACHE_KEY = 'tiny-helsinki-events:cache:v1';

export function loadCached(): RefreshResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RefreshResult;
  } catch {
    return null;
  }
}

function saveCache(result: RefreshResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // localStorage may be unavailable/full — non-fatal.
  }
}

export async function fetchFreshEvents(): Promise<RefreshResult> {
  const { events, logs } = await runScrapers(WEB_SCRAPERS);
  const result: RefreshResult = { events, logs, lastUpdated: new Date().toISOString() };
  saveCache(result);
  return result;
}
