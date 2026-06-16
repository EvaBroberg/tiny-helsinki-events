// Base scraper for the Helsinki Region "Linked Events" open API
// (https://api.hel.fi/linkedevents/v1/). This is a free, open (CC-BY) data
// source published by the City of Helsinki that aggregates events from Helsinki,
// Espoo, Vantaa and other regional publishers. It is NOT a paid API.
//
// We query per-city via the `division=kunta:<city>` filter and the children
// keyword (yso:p4354). The transform from a Linked Events record to our
// NormalizeInput is a pure function (`linkedEventToInput`) so it can be tested
// against a saved fixture without hitting the network.

import type { City, KidEvent } from '@shared/types';
import { normalizeEvent, type NormalizeInput } from '../lib/normalizeEvent.js';
import { isoToHelsinkiDate, isoToHelsinkiTime } from '../lib/dateParser.js';
import { addDays } from '../lib/eventWindow.js';
import type { Scraper, ScrapeContext } from './types.js';

const API_BASE = 'https://api.hel.fi/linkedevents/v1/event/';
const CHILDREN_KEYWORD = 'yso:p4354'; // "lapset" (children) — verified to return kids events.
const SOURCE_URL = 'https://linkedevents.hel.fi/';

// ---- Linked Events response shapes (only the fields we use) ----
interface LangString {
  fi?: string;
  en?: string;
  sv?: string;
}
interface LePlace {
  name?: LangString;
  address_locality?: LangString | string;
  street_address?: LangString | string;
}
interface LeOffer {
  is_free?: boolean;
  price?: LangString;
  description?: LangString;
}
interface LeImage {
  url?: string;
}
interface LeKeyword {
  name?: LangString;
}
export interface LeEvent {
  id: string;
  name?: LangString;
  short_description?: LangString;
  description?: LangString;
  start_time?: string;
  end_time?: string;
  location?: LePlace;
  keywords?: LeKeyword[];
  info_url?: LangString;
  images?: LeImage[];
  offers?: LeOffer[];
  audience_min_age?: number | null;
  audience_max_age?: number | null;
}
export interface LeResponse {
  meta: { count: number; next: string | null };
  data: LeEvent[];
}

function pickLang(s: LangString | string | undefined | null): string {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.fi || s.en || s.sv || '';
}

/**
 * Pick the best display string in the event's ORIGINAL language (Finnish first,
 * then Swedish, then English). We intentionally do NOT pre-translate — the page
 * is served in its source language so the browser can offer its native
 * "Translate this page?" experience. Also reports the language used.
 */
function pickDisplay(
  ...sources: (LangString | undefined)[]
): { text: string; lang: 'fi' | 'en' | 'sv' } {
  for (const lang of ['fi', 'sv', 'en'] as const) {
    for (const s of sources) {
      const v = s?.[lang];
      if (v && v.trim()) return { text: v, lang };
    }
  }
  return { text: '', lang: 'fi' };
}

function mapCity(locality: string, fallback: City): City {
  const l = locality.toLowerCase();
  if (l.includes('helsinki') || l.includes('helsingfors')) return 'Helsinki';
  if (l.includes('espoo') || l.includes('esbo')) return 'Espoo';
  if (l.includes('vantaa') || l.includes('vanda')) return 'Vantaa';
  if (l.includes('sipoo') || l.includes('sibbo')) return 'Sipoo';
  return fallback;
}

function ageRange(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max} v`;
  if (min != null) return `${min}+ v`;
  return `–${max} v`;
}

export interface LinkedEventsTransformOpts {
  fallbackCity: City;
  sourceName: string;
  isMock?: boolean;
  scrapedAt?: string;
}

/**
 * Pure transform: Linked Events record -> NormalizeInput. Returns null when the
 * record lacks the minimum required data (a title and a start date).
 */
export function linkedEventToInput(
  raw: LeEvent,
  opts: LinkedEventsTransformOpts,
): NormalizeInput | null {
  const titlePick = pickDisplay(raw.name);
  const title = titlePick.text.trim();
  if (!title) return null;
  if (!raw.start_time) return null;

  const startDate = isoToHelsinkiDate(raw.start_time);
  if (!startDate) return null;
  let startTime = isoToHelsinkiTime(raw.start_time);

  let endDate: string | null = null;
  if (raw.end_time) {
    const ed = isoToHelsinkiDate(raw.end_time);
    if (ed && ed !== startDate) endDate = ed;
  }

  // For multi-day events (exhibitions etc.) the start_time is usually a midnight
  // placeholder, not a real show time, so showing it (e.g. "03:00") is
  // misleading — drop it.
  if (endDate && endDate !== startDate) startTime = null;

  const locality = pickLang(raw.location?.address_locality);
  const placeName = pickLang(raw.location?.name);
  const street = pickLang(raw.location?.street_address);
  const location = [placeName, street].filter(Boolean).join(', ') || locality || null;
  const city = mapCity(locality || placeName, opts.fallbackCity);

  const offer = raw.offers?.[0];
  const isFree = offer?.is_free ?? null;
  const priceText = pickLang(offer?.price) || pickLang(offer?.description) || null;

  const keywordsText = (raw.keywords ?? []).map((k) => pickLang(k.name)).join(' ');
  const descPick = pickDisplay(raw.short_description, raw.description);
  const description = descPick.text;

  // The event is "English" only if everything we show is English; otherwise we
  // mark its source language so the UI can offer a translate button.
  let lang: 'fi' | 'en' | 'sv' = 'en';
  if (titlePick.lang !== 'en') lang = titlePick.lang;
  else if (description && descPick.lang !== 'en') lang = descPick.lang;

  const eventUrl = pickDisplay(raw.info_url).text || `https://linkedevents.hel.fi/fi/event/${raw.id}`;

  return {
    title,
    description,
    startDate,
    endDate,
    startTime,
    location,
    city,
    sourceName: opts.sourceName,
    sourceUrl: SOURCE_URL,
    eventUrl,
    ageRange: ageRange(raw.audience_min_age, raw.audience_max_age),
    priceText,
    isFree,
    imageUrl: raw.images?.[0]?.url ?? null,
    extraText: keywordsText,
    isMock: opts.isMock ?? false,
    scrapedAt: opts.scrapedAt,
    lang,
  };
}

async function fetchJson(url: string, timeoutMs = 15000): Promise<LeResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TinyHelsinkiEvents/0.1 (personal kids-events desktop app)',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as LeResponse;
  } finally {
    clearTimeout(timer);
  }
}

export interface LinkedEventsScraperConfig {
  name: string;
  /** municipality slug for the division filter, e.g. "helsinki". Omit for region-wide. */
  divisionKunta?: string;
  fallbackCity: City;
  /** Extra query params merged in (e.g. a different keyword set). */
  extraParams?: Record<string, string>;
  /** Optional post-filter applied to normalized events (e.g. only libraries). */
  keep?: (event: KidEvent) => boolean;
}

export function makeLinkedEventsScraper(config: LinkedEventsScraperConfig): Scraper {
  return {
    name: config.name,
    isMock: false,
    async scrape(ctx: ScrapeContext): Promise<KidEvent[]> {
      const end = addDays(ctx.todayISO, ctx.windowDays);
      const params = new URLSearchParams({
        keyword: CHILDREN_KEYWORD,
        start: ctx.todayISO,
        end,
        sort: 'start_time',
        page_size: '100',
        include: 'location,keywords',
        ...config.extraParams,
      });
      if (config.divisionKunta) params.set('division', `kunta:${config.divisionKunta}`);

      const scrapedAt = new Date().toISOString();
      const out: KidEvent[] = [];
      let url: string | null = `${API_BASE}?${params.toString()}`;
      let page = 0;
      const MAX_PAGES = 3;

      while (url && page < MAX_PAGES) {
        page += 1;
        const resp: LeResponse = await fetchJson(url);
        for (const raw of resp.data ?? []) {
          const input = linkedEventToInput(raw, {
            fallbackCity: config.fallbackCity,
            sourceName: config.name,
            scrapedAt,
          });
          if (!input) continue;
          const ev = normalizeEvent(input);
          if (config.keep && !config.keep(ev)) continue;
          out.push(ev);
        }
        url = resp.meta?.next ?? null;
      }

      ctx.logger.info(`${config.name}: fetched ${out.length} normalized events across ${page} page(s)`);
      return out;
    },
  };
}
