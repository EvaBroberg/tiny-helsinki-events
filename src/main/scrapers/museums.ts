// Region-wide museum & children's culture-centre kids events via Linked Events
// (e.g. Annantalo, children's culture centres, museum family workshops). We
// query region-wide children's events and keep exhibitions / museum-located /
// culture-centre programming.
import { makeLinkedEventsScraper } from './linkedEventsBase.js';

const MUSEUM_HINT = /(museo|museum|taidehalli|annantalo|kulttuurikeskus|kultturhus|galleria|gallery)/i;

export const museumsScraper = makeLinkedEventsScraper({
  name: 'Museot & lastenkulttuuri / Museums (Linked Events)',
  fallbackCity: 'Helsinki',
  keep: (e) =>
    e.tags.includes('exhibition') ||
    e.tags.includes('workshop') ||
    MUSEUM_HINT.test(`${e.location ?? ''} ${e.title}`),
});
