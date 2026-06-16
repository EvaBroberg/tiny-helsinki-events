// On-demand translation to English using the free MyMemory API
// (https://mymemory.translated.net/) — no API key, CORS-open, ~5000 words/day
// anonymous. Results are cached in localStorage so repeat views and refreshes
// don't re-spend the quota.

const CACHE_KEY = 'tiny-helsinki-events:translations:v1';

type Cache = Record<string, string>;

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full / unavailable — non-fatal.
  }
}

/** Translate a single string from `from` (default Finnish) to English. */
export async function translateToEnglish(text: string, from: 'fi' | 'sv' = 'fi'): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const key = `${from}:${trimmed}`;
  const cache = loadCache();
  if (cache[key]) return cache[key];

  // MyMemory limits anonymous queries to ~500 chars; keep well under.
  const q = trimmed.slice(0, 480);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from}|en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`translation failed: HTTP ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const out = data.responseData?.translatedText?.trim() || trimmed;

  cache[key] = out;
  saveCache(cache);
  return out;
}

export interface TranslatedEvent {
  title: string;
  description: string;
}

/** Translate an event's title + description together (in parallel). */
export async function translateEvent(
  title: string,
  description: string,
  from: 'fi' | 'sv' = 'fi',
): Promise<TranslatedEvent> {
  const [t, d] = await Promise.all([
    translateToEnglish(title, from),
    description ? translateToEnglish(description, from) : Promise.resolve(''),
  ]);
  return { title: t, description: d };
}
