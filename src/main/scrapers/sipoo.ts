// Sipoo (Sibbo) kids/family events via the Linked Events open API.
//
// NOTE: Sipoo currently publishes ~no events to the Helsinki Region Linked
// Events API, so this source is usually empty. That is the honest state — we no
// longer show invented "fixture" events. If Sipoo starts publishing (or a
// dedicated sipoo.fi scraper is added later), events will appear here
// automatically.
import { makeLinkedEventsScraper } from './linkedEventsBase.js';

export const sipooScraper = makeLinkedEventsScraper({
  name: 'Sipoo – Tapahtumat (Linked Events)',
  divisionKunta: 'sipoo',
  fallbackCity: 'Sipoo',
});
