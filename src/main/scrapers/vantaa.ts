// Vantaa kids/family events via the Linked Events open API.
import { makeLinkedEventsScraper } from './linkedEventsBase.js';

export const vantaaScraper = makeLinkedEventsScraper({
  name: 'Vantaa – Tapahtumat (Linked Events)',
  divisionKunta: 'vantaa',
  fallbackCity: 'Vantaa',
});
