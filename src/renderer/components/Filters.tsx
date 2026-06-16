import React from 'react';
import type { AgeBucket, EventFilters, Price } from '@shared/types';
import { CITIES } from '@shared/types';

const AGES: AgeBucket[] = ['baby', 'toddler', 'preschool', 'school-age', 'family'];
const PRICES: Price[] = ['free', 'paid', 'unknown'];
const SETTINGS: ('indoor' | 'outdoor')[] = ['indoor', 'outdoor'];

interface Props {
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
}

/** Toggle a value in/out of an array (used by every filter group). */
function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

export function Filters({ filters, onChange }: Props): React.JSX.Element {
  const activeCount =
    filters.cities.length + filters.ages.length + filters.prices.length + filters.settings.length;

  const clearAll = () =>
    onChange({ cities: [], ages: [], prices: [], settings: [] });

  return (
    <details className="filters-section" open>
      <summary className="filters-summary">
        <span>🔍 Filters</span>
        {activeCount > 0 ? (
          <span className="filters-count">{activeCount} active</span>
        ) : (
          <span className="filters-hint">showing everything</span>
        )}
      </summary>

      <div className="filters">
        <div className="filter-group">
          <h4>City</h4>
          <div className="chips">
            {CITIES.map((c) => (
              <button
                key={c}
                className={`chip ${filters.cities.includes(c) ? 'on' : ''}`}
                onClick={() => onChange({ ...filters, cities: toggle(filters.cities, c) })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Age</h4>
          <div className="chips">
            {AGES.map((a) => (
              <button
                key={a}
                className={`chip ${filters.ages.includes(a) ? 'on' : ''}`}
                onClick={() => onChange({ ...filters, ages: toggle(filters.ages, a) })}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Price</h4>
          <div className="chips">
            {PRICES.map((p) => (
              <button
                key={p}
                className={`chip ${filters.prices.includes(p) ? 'on' : ''}`}
                onClick={() => onChange({ ...filters, prices: toggle(filters.prices, p) })}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Setting</h4>
          <div className="chips">
            {SETTINGS.map((s) => (
              <button
                key={s}
                className={`chip ${filters.settings.includes(s) ? 'on' : ''}`}
                onClick={() => onChange({ ...filters, settings: toggle(filters.settings, s) })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group filter-actions">
          <h4>&nbsp;</h4>
          <button className="clear-btn" onClick={clearAll} disabled={activeCount === 0}>
            ✕ Clear filters
          </button>
        </div>
      </div>
    </details>
  );
}
