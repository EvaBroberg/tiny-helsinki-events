// Helsinki kids/family events via the Linked Events open API.
import { makeLinkedEventsScraper } from './linkedEventsBase.js';

export const helsinkiScraper = makeLinkedEventsScraper({
  name: 'Helsinki – Tapahtumat (Linked Events)',
  divisionKunta: 'helsinki',
  fallbackCity: 'Helsinki',
});
