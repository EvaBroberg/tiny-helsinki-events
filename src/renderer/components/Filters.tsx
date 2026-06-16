import React, { useEffect, useRef, useState } from 'react';
import type { AgeBucket, EventFilters, Price } from '@shared/types';
import { CITIES } from '@shared/types';

const AGES: AgeBucket[] = ['0-1', '1-3', '3-6', '7+'];
const PRICES: Price[] = ['free', 'paid', 'unknown'];
const SETTINGS: ('indoor' | 'outdoor')[] = ['indoor', 'outdoor'];

interface Props {
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface DropdownProps<T extends string> {
  label: string;
  items: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
}

function Dropdown<T extends string>({ label, items, selected, onToggle }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const count = new Set(selected).size;

  return (
    <div className="dd" ref={ref}>
      <button
        className={`dd-btn ${count ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}
        {count > 0 && <span className="dd-badge">{count}</span>}
        <span className="dd-caret">▾</span>
      </button>
      {open && (
        <div className="dd-panel">
          {items.map((it) => {
            const on = selected.includes(it);
            return (
              <button
                key={it}
                type="button"
                className={`dd-item ${on ? 'sel' : ''}`}
                onClick={() => onToggle(it)}
                role="checkbox"
                aria-checked={on}
              >
                <span className={`dd-box ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                <span>{cap(it)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Group = 'cities' | 'ages' | 'prices' | 'settings';

export function Filters({ filters, onChange }: Props): React.JSX.Element {
  const activeCount =
    new Set(filters.cities).size +
    new Set(filters.ages).size +
    new Set(filters.prices).size +
    new Set(filters.settings).size;

  const remove = (group: Group, value: string) =>
    onChange({ ...filters, [group]: (filters[group] as string[]).filter((x) => x !== value) });

  const active: { group: Group; value: string }[] = [
    ...filters.cities.map((v) => ({ group: 'cities' as const, value: v })),
    ...filters.ages.map((v) => ({ group: 'ages' as const, value: v })),
    ...filters.prices.map((v) => ({ group: 'prices' as const, value: v })),
    ...filters.settings.map((v) => ({ group: 'settings' as const, value: v })),
  ];

  return (
    <div className="filters-wrap">
    <div className="filter-bar">
      <span className="filter-bar-label">Filter</span>

      <Dropdown
        label="City"
        items={CITIES}
        selected={filters.cities}
        onToggle={(c) => onChange({ ...filters, cities: toggle(filters.cities, c) })}
      />
      <Dropdown
        label="Age"
        items={AGES}
        selected={filters.ages}
        onToggle={(a) => onChange({ ...filters, ages: toggle(filters.ages, a) })}
      />
      <Dropdown
        label="Price"
        items={PRICES}
        selected={filters.prices}
        onToggle={(p) => onChange({ ...filters, prices: toggle(filters.prices, p) })}
      />
      <Dropdown
        label="Setting"
        items={SETTINGS}
        selected={filters.settings}
        onToggle={(s) => onChange({ ...filters, settings: toggle(filters.settings, s) })}
      />

      {activeCount > 0 ? (
        <button
          className="filter-clear"
          onClick={() => onChange({ cities: [], ages: [], prices: [], settings: [] })}
        >
          ✕ Clear all ({activeCount})
        </button>
      ) : (
        <span className="filter-bar-hint">Showing everything</span>
      )}
    </div>

      {active.length > 0 && (
        <div className="active-filters">
          <span className="active-filters-label">Active:</span>
          {active.map((a) => (
            <button
              key={`${a.group}:${a.value}`}
              className="active-chip"
              onClick={() => remove(a.group, a.value)}
              title="Remove this filter"
            >
              {cap(a.value)} <span className="active-chip-x">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
