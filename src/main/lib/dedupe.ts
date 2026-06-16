// Deduplication. Events from different sources (or repeated within one source)
// frequently describe the same happening. We collapse them by:
//   1. exact contentHash, then
//   2. a fuzzy key of (normalized title + startDate) to catch the same event
//      listed by two cities/sources with slightly different locations.
// When duplicates are found, we prefer the richer record (longer description,
// has image, live over mock).

import type { KidEvent } from '@shared/types';

function fuzzyKey(e: KidEvent): string {
  const title = e.title.toLowerCase().replace(/[^a-z0-9äöå]+/gi, '').trim();
  return `${title}|${e.startDate}`;
}

function score(e: KidEvent): number {
  let s = 0;
  s += e.description.length;
  if (e.imageUrl) s += 50;
  if (e.startTime) s += 20;
  if (e.ageRange) s += 20;
  if (!e.isMock) s += 1000; // strongly prefer live data over fixtures
  return s;
}

export function dedupeEvents(events: KidEvent[]): KidEvent[] {
  const byKey = new Map<string, KidEvent>();

  for (const ev of events) {
    // Use the strongest available identity key.
    const exactKey = `hash:${ev.contentHash}`;
    const looseKey = `fuzzy:${fuzzyKey(ev)}`;

    const existingExact = byKey.get(exactKey);
    const existingLoose = byKey.get(looseKey);
    const existing = existingExact ?? existingLoose;

    if (!existing) {
      byKey.set(exactKey, ev);
      byKey.set(looseKey, ev);
      continue;
    }

    // Keep whichever scores higher; update both keys to point at the winner.
    const winner = score(ev) > score(existing) ? ev : existing;
    byKey.set(exactKey, winner);
    byKey.set(looseKey, winner);
  }

  // Collect distinct winners (a winner is referenced by multiple keys).
  const seen = new Set<string>();
  const result: KidEvent[] = [];
  for (const ev of byKey.values()) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    result.push(ev);
  }
  return result;
}
