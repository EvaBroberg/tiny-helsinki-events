// Node/Electron scraper registry. This file imports the fs-backed Sipoo fixture
// scraper, so it is NOT browser-safe — the web app builds its own scraper list
// (see src/web/scrape.ts) and calls runScrapers() directly.
//
// To add a new source: create a file exporting a `Scraper`, import it here, and
// add it to SCRAPERS. Relevance filtering, the 7-day window, dedup, per-source
// logging and sorting are all handled by runScrapers().

import { runScrapers, type OrchestratorResult, type RunOptions } from './runner.js';
import type { Scraper } from './types.js';

import { helsinkiScraper } from './helsinki.js';
import { espooScraper } from './espoo.js';
import { vantaaScraper } from './vantaa.js';
import { sipooScraper } from './sipoo.js';

export const SCRAPERS: Scraper[] = [helsinkiScraper, espooScraper, vantaaScraper, sipooScraper];

export type { OrchestratorResult, RunOptions };

export function runAllScrapers(options: RunOptions = {}): Promise<OrchestratorResult> {
  return runScrapers(SCRAPERS, options);
}
