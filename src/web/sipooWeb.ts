// Browser version of the Sipoo fixture scraper. Identical sample data to the
// desktop one, but the JSON is bundled at build time (Vite JSON import) instead
// of read from disk, so it works in the browser. Clearly labelled isMock:true.

import type { KidEvent } from '@shared/types';
import { normalizeEvent } from '../main/lib/normalizeEvent.js';
import { addDays } from '../main/lib/eventWindow.js';
import type { Scraper, ScrapeContext } from '../main/scrapers/types.js';
import fixture from '../main/scrapers/fixtures/sipoo.sample.json';

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

export const sipooWebScraper: Scraper = {
  name: 'Sipoo (fixture/mock)',
  isMock: true,
  async scrape(ctx: ScrapeContext): Promise<KidEvent[]> {
    const scrapedAt = new Date().toISOString();
    const events = (fixture.events as SipooFixtureEvent[]).map((e) =>
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
