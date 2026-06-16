import React, { useState } from 'react';
import type { KidEvent } from '@shared/types';
import { formatWhen } from '../format.js';
import { translateEvent } from '../translate.js';

const TAG_EMOJI: Record<string, string> = {
  baby: '👶',
  toddler: '🧸',
  preschool: '🖍️',
  'school-age': '🎒',
  family: '👨‍👩‍👧',
  kids: '🧒',
  exhibition: '🖼️',
  theatre: '🎭',
  workshop: '✂️',
  popup: '✨',
  free: '💸',
  outdoor: '🌳',
  indoor: '🏠',
  music: '🎵',
  storytime: '📖',
  library: '📚',
};

function cardEmoji(event: KidEvent): string {
  for (const t of ['theatre', 'music', 'workshop', 'exhibition', 'storytime', 'outdoor']) {
    if (event.tags.includes(t as never)) return TAG_EMOJI[t];
  }
  return '🎈';
}

export function EventCard({ event }: { event: KidEvent }): React.JSX.Element {
  const [translated, setTranslated] = useState<{ title: string; description: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);

  // Offer translation whenever the displayed text isn't English.
  const canTranslate = event.lang !== 'en';
  const from = event.lang === 'sv' ? 'sv' : 'fi';

  const onTranslate = async () => {
    if (translated) {
      setTranslated(null); // toggle back to original
      return;
    }
    setTranslating(true);
    setTranslateError(false);
    try {
      setTranslated(await translateEvent(event.title, event.description, from));
    } catch {
      setTranslateError(true);
    } finally {
      setTranslating(false);
    }
  };

  const title = translated?.title || event.title;
  const description = translated ? translated.description : event.description;

  return (
    <div className="card">
      {event.imageUrl ? (
        <div className="card-img" style={{ backgroundImage: `url(${event.imageUrl})` }} />
      ) : (
        <div className="card-img placeholder">{cardEmoji(event)}</div>
      )}
      <div className="card-body">
        {event.isMock && <span className="badge-mock">fixture / mock</span>}
        <div className="card-when">{formatWhen(event)}</div>
        <h3 className="card-title">{title}</h3>
        <div className="card-meta">
          <span>📍 {event.location ?? event.city}</span>
          <span>🏙️ {event.city}</span>
          {event.ageRange && <span>🎂 {event.ageRange}</span>}
          <span>{event.price === 'free' ? '🆓 Free' : event.price === 'paid' ? '🎟️ Paid' : '❓ Price n/a'}</span>
        </div>
        {description && <p className="card-desc">{description}</p>}
        {canTranslate && (
          <button className="translate-btn" onClick={onTranslate} disabled={translating}>
            {translating
              ? '🌐 Translating…'
              : translated
                ? '↩︎ Show original'
                : `🌐 Translate from ${event.lang === 'sv' ? 'Swedish' : 'Finnish'}`}
          </button>
        )}
        {translateError && <span className="translate-err">Couldn’t translate — try again.</span>}
        <div className="tag-row">
          {event.tags.slice(0, 6).map((t) => (
            <span key={t} className={`tag ${t}`}>
              {TAG_EMOJI[t] ?? ''} {t}
            </span>
          ))}
        </div>
        <div className="card-footer">
          <span className="source">via {event.sourceName}</span>
          <a className="link-btn" href={event.eventUrl} target="_blank" rel="noreferrer">
            Open ↗
          </a>
        </div>
      </div>
    </div>
  );
}
