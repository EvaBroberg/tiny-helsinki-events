// Sipoo (Sibbo) events.
//
// TODO: Implement a real Sipoo scraper. Sipoo is currently sparse in the
// Helsinki Linked Events open API, and sipoo.fi does not expose a clean event
// feed. Options to investigate:
//   - the municipality's tapahtumakalenteri at https://www.sipoo.fi/tapahtumat/
//     (inspect the real DOM before writing Cheerio selectors), or
//   - the HelMet library API for the Sipoo library branch.
// Until then this is a FIXTURE/MOCK scraper. It is clearly labelled isMock:true
// and the UI badges these events as "fixture/mock".

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { KidEvent } from '@shared/types';
import { normalizeEvent } from '../lib/normalizeEvent.js';
import { addDays } from '../lib/eventWindow.js';
import type { Scraper, ScrapeContext } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SipooFixtureEvent {
  title: string;
  description: string;
  dayOffset: number;
  startTime: string;
  location: string;
  ageRange: string;
  priceText: string;
  isFree: boolean;
  eventUrl: string;
}

interface SipooFixture {
  source: string;
  events: SipooFixtureEvent[];
}

export function loadSipooFixture(): SipooFixture {
  // Resolve relative to this module so it works from src (tsx/vitest) and from
  // the bundled out/ directory.
  const candidates = [
    join(__dirname, 'fixtures/sipoo.sample.json'),
    join(__dirname, '../../src/main/scrapers/fixtures/sipoo.sample.json'),
    join(process.cwd(), 'src/main/scrapers/fixtures/sipoo.sample.json'),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as SipooFixture;
    } catch {
      // try next candidate
    }
  }
  throw new Error('Could not locate sipoo.sample.json fixture');
}

export const sipooScraper: Scraper = {
  name: 'Sipoo (fixture/mock)',
  isMock: true,
  async scrape(ctx: ScrapeContext): Promise<KidEvent[]> {
    const fixture = loadSipooFixture();
    const scrapedAt = new Date().toISOString();
    const events = fixture.events.map((e) =>
      normalizeEvent({
        title: e.title,
        description: e.description,
        startDate: addDays(ctx.todayISO, e.dayOffset),
        startTime: e.startTime,
        location: e.location,
        city: 'Sipoo',
        sourceName: 'Sipoo (fixture/mock)',
        sourceUrl: 'https://www.sipoo.fi/tapahtumat/',
        eventUrl: e.eventUrl,
        ageRange: e.ageRange,
        priceText: e.priceText,
        isFree: e.isFree,
        isMock: true,
        scrapedAt,
      }),
    );
    ctx.logger.info(`Sipoo (fixture/mock): produced ${events.length} sample events`);
    return events;
  },
};
