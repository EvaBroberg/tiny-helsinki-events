// Derive display/filter tags from free text + structured hints.

import type { Tag } from '@shared/types';

interface TagSignal {
  tag: Tag;
  patterns: RegExp[];
}

// Keyword -> tag mapping. Finnish + English. Order does not matter; all matches apply.
const SIGNALS: TagSignal[] = [
  { tag: 'baby', patterns: [/\bvauva/i, /\bbaby/i, /\bbabies\b/i, /\bvauvojen/i] },
  { tag: 'toddler', patterns: [/\btaapero/i, /\btoddler/i, /\bpikkulapset/i] },
  { tag: 'preschool', patterns: [/\beskari/i, /\bpreschool/i, /\bleikki-ik/i] },
  { tag: 'school-age', patterns: [/\bkouluik/i, /\bschool[- ]age/i, /\balakoulu/i] },
  {
    tag: 'family',
    patterns: [/\bperhe/i, /\bperheet/i, /\bfamily/i, /\bfamilies\b/i, /\bkoko perhe/i],
  },
  {
    tag: 'exhibition',
    patterns: [/\bnäyttely/i, /\bexhibition/i, /\bnäyttelyt/i],
  },
  {
    tag: 'theatre',
    patterns: [/\bteatteri/i, /\btheatre/i, /\btheater/i, /\bnukketeatteri/i, /\bpuppet/i, /\bnukke/i],
  },
  {
    tag: 'workshop',
    patterns: [/\btyöpaja/i, /\bworkshop/i, /\bpaja\b/i, /\baskartelu/i, /\bcraft/i],
  },
  { tag: 'popup', patterns: [/\bpop[- ]?up/i, /\bpopup/i] },
  {
    tag: 'music',
    patterns: [/\bmusiikki/i, /\bmusic\b/i, /\bkonsertti/i, /\bconcert/i, /\blaulu/i, /\bsong/i],
  },
  {
    tag: 'storytime',
    patterns: [/\bsatu/i, /\bsatutuokio/i, /\bstorytime/i, /\bstory time/i, /\bsadut/i],
  },
  {
    tag: 'library',
    patterns: [/\bkirjasto/i, /\blibrary/i, /\bkirjastot/i],
  },
];

const OUTDOOR_PATTERNS = [
  /\bulko/i, // ulkoilu, ulkona
  /\boutdoor/i,
  /puisto/i, // puisto, leikkipuisto, kaupunginpuisto
  /\bpark\b/i,
  /metsä/i,
  /\bforest/i,
  /\bpiha\b/i,
  /ranta/i, // ranta, uimaranta
  /\bbeach/i,
  /luonto/i,
  /\bnature/i,
  /kenttä/i, // kenttä, leikkikenttä, urheilukenttä
  /\bfield\b/i,
  /\btori\b/i, // market square
  /stadion/i,
  /\bgarden\b/i,
  /puutarha/i,
];

const INDOOR_PATTERNS = [
  /\bsisä/i,
  /\bindoor/i,
  /museo/i,
  /\bmuseum/i,
  /kirjasto/i,
  /\blibrar/i,
  /bibliotek/i,
  /talo\b/i, // Annantalo, kulttuuritalo, kaupungintalo
  /sali\b/i, // juhlasali, liikuntasali
  /keskus/i, // kulttuurikeskus, kauppakeskus
  /halli\b/i, // urheiluhalli, jäähalli
  /teatteri/i,
  /\btheatre\b/i,
  /\btheater\b/i,
  /galleria/i,
  /\bgallery\b/i,
  /kino/i,
  /elokuva/i,
  /\bcinema\b/i,
];

const KIDS_PATTERNS = [/\blapset/i, /\blapsille/i, /\bkids?\b/i, /\bchildren/i, /\blasten/i];

export function deriveTags(text: string): Tag[] {
  const tags = new Set<Tag>();
  for (const signal of SIGNALS) {
    if (signal.patterns.some((p) => p.test(text))) tags.add(signal.tag);
  }
  if (KIDS_PATTERNS.some((p) => p.test(text))) tags.add('kids');
  return [...tags];
}

/**
 * Decide indoor/outdoor from text. Returns true (indoor), false (outdoor), or
 * null (unknown). Outdoor signals win when both appear, since "indoor museum
 * with an outdoor program" is rarer than the reverse.
 */
export function deriveIndoor(text: string): boolean | null {
  const outdoor = OUTDOOR_PATTERNS.some((p) => p.test(text));
  const indoor = INDOOR_PATTERNS.some((p) => p.test(text));
  if (outdoor) return false;
  if (indoor) return true;
  return null;
}
