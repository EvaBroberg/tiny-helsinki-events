// Region-wide library kids events (storytimes, craft workshops) via Linked
// Events. Libraries (HelMet network) publish their children's programme here.
// We query the whole region for children's events and keep the ones happening
// at a library / that look like library programming.
import { makeLinkedEventsScraper } from './linkedEventsBase.js';

const LIBRARY_HINT = /(kirjasto|bibliotek|library)/i;

export const librariesScraper = makeLinkedEventsScraper({
  name: 'Kirjastot / Libraries (HelMet, Linked Events)',
  fallbackCity: 'Helsinki',
  keep: (e) =>
    e.tags.includes('library') ||
    e.tags.includes('storytime') ||
    LIBRARY_HINT.test(`${e.location ?? ''} ${e.title}`),
});
