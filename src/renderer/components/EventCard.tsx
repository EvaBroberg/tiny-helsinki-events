import React from 'react';
import type { KidEvent } from '@shared/types';
import { formatWhen } from '../format.js';

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

// Age/kind words are conveyed by the 🎂 age range + emoji, so don't repeat them
// as coloured chips (keeps cards clean and consistent with the numeric filters).
const HIDDEN_TAGS = new Set(['baby', 'toddler', 'preschool', 'school-age', 'family', 'kids']);

function cardEmoji(event: KidEvent): string {
  for (const t of ['theatre', 'music', 'workshop', 'exhibition', 'storytime', 'outdoor']) {
    if (event.tags.includes(t as never)) return TAG_EMOJI[t];
  }
  return '🎈';
}

export function EventCard({ event }: { event: KidEvent }): React.JSX.Element {
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
        <h3 className="card-title">{event.title}</h3>
        <div className="card-meta">
          <span>📍 {event.location ?? event.city}</span>
          <span>🏙️ {event.city}</span>
          {event.ageRange && <span>🎂 {event.ageRange}</span>}
          <span>{event.price === 'free' ? '🆓 Free' : event.price === 'paid' ? '🎟️ Paid' : '❓ Price n/a'}</span>
        </div>
        {event.description && <p className="card-desc">{event.description}</p>}
        <div className="tag-row">
          {event.tags
            .filter((t) => !HIDDEN_TAGS.has(t))
            .slice(0, 6)
            .map((t) => (
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
