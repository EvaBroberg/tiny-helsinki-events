// Espoo kids/family events via the Linked Events open API.
import { makeLinkedEventsScraper } from './linkedEventsBase.js';

export const espooScraper = makeLinkedEventsScraper({
  name: 'Espoo – Tapahtumat (Linked Events)',
  divisionKunta: 'espoo',
  fallbackCity: 'Espoo',
});
