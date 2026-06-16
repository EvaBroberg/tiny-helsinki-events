import React from 'react';
import type { AgeBucket, City, EventFilters, Price } from '@shared/types';
import { CITIES } from '@shared/types';

const AGES: AgeBucket[] = ['baby', 'toddler', 'preschool', 'school-age', 'family'];
const PRICES: (Price | 'all')[] = ['all', 'free', 'paid', 'unknown'];
const SETTINGS: EventFilters['setting'][] = ['all', 'indoor', 'outdoor'];

interface Props {
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
}

export function Filters({ filters, onChange }: Props): React.JSX.Element {
  const toggleCity = (c: City) => {
    const has = filters.cities.includes(c);
    onChange({
      ...filters,
      cities: has ? filters.cities.filter((x) => x !== c) : [...filters.cities, c],
    });
  };
  const toggleAge = (a: AgeBucket) => {
    const has = filters.ages.includes(a);
    onChange({
      ...filters,
      ages: has ? filters.ages.filter((x) => x !== a) : [...filters.ages, a],
    });
  };

  return (
    <div className="filters">
      <div className="filter-group">
        <h4>City</h4>
        <div className="chips">
          {CITIES.map((c) => (
            <button
              key={c}
              className={`chip ${filters.cities.includes(c) ? 'on' : ''}`}
              onClick={() => toggleCity(c)}
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
              onClick={() => toggleAge(a)}
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
              className={`chip ${filters.price === p ? 'on' : ''}`}
              onClick={() => onChange({ ...filters, price: p })}
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
              className={`chip ${filters.setting === s ? 'on' : ''}`}
              onClick={() => onChange({ ...filters, setting: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
