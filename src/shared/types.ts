// Shared types used by both the Electron main process (scrapers, db) and the
// React renderer. Keep this file free of any Node/Electron/browser imports so it
// can be imported from anywhere.

export type City = 'Helsinki' | 'Espoo' | 'Vantaa' | 'Sipoo' | 'Unknown';

export const CITIES: City[] = ['Helsinki', 'Espoo', 'Vantaa', 'Sipoo'];

export type Price = 'free' | 'paid' | 'unknown';

export type AgeBucket = 'baby' | 'toddler' | 'preschool' | 'school-age' | 'family';

/** Tags we attach to events for filtering / display. */
export type Tag =
  | 'kids'
  | 'baby'
  | 'toddler'
  | 'preschool'
  | 'school-age'
  | 'family'
  | 'exhibition'
  | 'theatre'
  | 'workshop'
  | 'popup'
  | 'free'
  | 'outdoor'
  | 'indoor'
  | 'music'
  | 'storytime'
  | 'library';

/** The canonical event record. Mirrors the SQLite `events` table. */
export interface KidEvent {
  id: string;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  startDate: string;
  /** ISO date, YYYY-MM-DD, or null when single-day / unknown. */
  endDate: string | null;
  /** HH:mm local time, or null when unknown / all-day. */
  startTime: string | null;
  location: string | null;
  city: City;
  sourceName: string;
  sourceUrl: string;
  eventUrl: string;
  ageRange: string | null;
  priceText: string | null;
  price: Price;
  tags: Tag[];
  /** true = indoor, false = outdoor, null = unknown. */
  indoor: boolean | null;
  imageUrl: string | null;
  /** ISO timestamp of when this event was scraped. */
  scrapedAt: string;
  /** Stable hash of the meaningful fields, used for deduplication. */
  contentHash: string;
  /** true when the event comes from a fixture/mock scraper rather than live data. */
  isMock: boolean;
}

/** Result of a single scraper run, surfaced in the debug panel. */
export interface ScraperRunLog {
  sourceName: string;
  isMock: boolean;
  rawCount: number;
  keptCount: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  error: string | null;
}

/** Full result of a refresh, returned to the renderer over IPC. */
export interface RefreshResult {
  events: KidEvent[];
  logs: ScraperRunLog[];
  lastUpdated: string;
}

export type TabKey = 'today' | 'tomorrow' | 'weekend' | 'week';

export interface EventFilters {
  cities: City[];
  ages: AgeBucket[];
  price: Price | 'all';
  /** 'all' | 'indoor' | 'outdoor' */
  setting: 'all' | 'indoor' | 'outdoor';
}
