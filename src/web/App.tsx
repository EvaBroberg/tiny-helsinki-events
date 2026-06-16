import React, { useEffect, useMemo, useState } from 'react';
import type { EventFilters, KidEvent, RefreshResult, TabKey } from '@shared/types';
import { tabsForEvent, helsinkiToday } from '../main/lib/eventWindow.js';
import { ageBucketsForEvent } from '../main/lib/relevance.js';
import { EventCard } from '../renderer/components/EventCard.js';
import { Filters } from '../renderer/components/Filters.js';
import { formatLastUpdated } from '../renderer/format.js';
import { fetchFreshEvents, loadCached } from './scrape.js';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'today', label: 'Today', emoji: '☀️' },
  { key: 'tomorrow', label: 'Tomorrow', emoji: '🌤️' },
  { key: 'weekend', label: 'This weekend', emoji: '🎡' },
  { key: 'week', label: 'This week', emoji: '📅' },
];

const EMPTY: RefreshResult = { events: [], logs: [], lastUpdated: '' };
const DEFAULT_FILTERS: EventFilters = { cities: [], ages: [], prices: [], settings: [] };

function matchesFilters(event: KidEvent, f: EventFilters): boolean {
  if (f.cities.length && !f.cities.includes(event.city)) return false;
  if (f.ages.length) {
    const buckets = ageBucketsForEvent(event);
    if (!f.ages.some((a) => buckets.includes(a))) return false;
  }
  if (f.prices.length && !f.prices.includes(event.price)) return false;
  if (f.settings.length) {
    const setting = event.indoor === true ? 'indoor' : event.indoor === false ? 'outdoor' : null;
    if (!setting || !f.settings.includes(setting)) return false;
  }
  return true;
}

export function App(): React.JSX.Element {
  const [data, setData] = useState<RefreshResult>(() => loadCached() ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('today');
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);

  const today = helsinkiToday();

  const refresh = async () => {
    setLoading(true);
    try {
      setData(await fetchFreshEvents());
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  // On first load: show cache instantly (if any), then fetch fresh in background.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byTab = useMemo(() => {
    const map: Record<TabKey, KidEvent[]> = { today: [], tomorrow: [], weekend: [], week: [] };
    for (const ev of data.events) {
      if (!matchesFilters(ev, filters)) continue;
      for (const t of tabsForEvent(ev, today)) map[t].push(ev);
    }
    return map;
  }, [data.events, filters, today]);

  const visible = byTab[tab];
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 120;
  const shown = showAll ? visible : visible.slice(0, LIMIT);
  const hasCache = data.events.length > 0;
  const activeFilterCount =
    filters.cities.length + filters.ages.length + filters.prices.length + filters.settings.length;
  const otherTabsWithMatches = TABS.filter((t) => t.key !== tab && byTab[t.key].length > 0);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>
            <span className="wave">🎈</span> Tiny Helsinki Events
          </h1>
          <p className="subtitle">
            Fresh, dated kid &amp; family happenings around Helsinki · Espoo · Vantaa · Sipoo
          </p>
        </div>
        <div className="header-right">
          <div className="last-updated">
            Last updated
            <br />
            <strong>{formatLastUpdated(data.lastUpdated)}</strong>
          </div>
          <button className="btn btn-primary" onClick={refresh} disabled={loading}>
            {loading ? '🔄 Refreshing…' : '🔄 Refresh events'}
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.emoji} {t.label}
            <span className="count">{byTab[t.key].length}</span>
          </button>
        ))}
      </nav>

      <Filters filters={filters} onChange={setFilters} />

      {visible.length > 0 ? (
        <>
          <div className="grid">
            {shown.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
          {visible.length > shown.length && (
            <div className="more-bar">
              Showing {shown.length} of {visible.length}. Narrow with filters, or{' '}
              <button className="more-btn" onClick={() => setShowAll(true)}>
                show all {visible.length}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <div className="big">{loading && !hasCache ? '🔄' : '🦋'}</div>
          {loading && !hasCache ? (
            <p>Looking for lovely little events… (first load fetches live, ~15s)</p>
          ) : activeFilterCount > 0 ? (
            <>
              <p>
                No events match your filters in{' '}
                <strong>{TABS.find((t) => t.key === tab)?.label}</strong>.
              </p>
              {otherTabsWithMatches.length > 0 && (
                <p className="empty-hints">
                  But there’s{' '}
                  {otherTabsWithMatches.map((t) => (
                    <button key={t.key} className="empty-hint" onClick={() => setTab(t.key)}>
                      {byTab[t.key].length} in {t.label.toLowerCase()}
                    </button>
                  ))}
                </p>
              )}
              <button className="btn btn-primary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                ✕ Clear filters
              </button>
            </>
          ) : (
            <p>No events here right now — try another tab or hit Refresh.</p>
          )}
        </div>
      )}
    </div>
  );
}
