# 🎈 Tiny Helsinki Events

A cute, cozy desktop app that shows a **fresh, daily list of temporary, dated, kid-friendly events** around **Helsinki, Espoo, Vantaa and Sipoo**. Open it in the morning and see what's on **today / tomorrow / this weekend / this week** — no generic "go to the zoo" filler, only events with a real date.

Built with **Electron + React + TypeScript + Vite**, a local **SQLite** database, and a modular scraper system running in Electron's Node backend. It also ships as a **hosted static website** (no install, no server) — see [Web version](#-web-version-hosted).

![tabs: Today · Tomorrow · This weekend · This week](https://img.shields.io/badge/tabs-today%20·%20tomorrow%20·%20weekend%20·%20week-ff8fb1)

---

## ✨ Features

- **Cute, playful UI** with four time tabs and filterable event cards.
- **Event cards** show title, date/time, location, city, age range, short description, source, a link button, price, and tags (kids, baby, toddler, exhibition, theatre, workshop, popup, free, outdoor…).
- **Filters**: city (Helsinki / Espoo / Vantaa / Sipoo), age (baby / toddler / preschool / school-age / family), price (free / paid / unknown), and indoor / outdoor.
- **Refresh events** button + **last updated** timestamp.
- **Debug panel** (collapsible) showing every scraper run: raw count, kept count, duration, and per-source errors. Scraping failures never crash the app.
- **Local SQLite** cache so the last results are there instantly on launch.

## 🔌 Data sources

The primary source is the **Helsinki Region Linked Events open API** (`api.hel.fi/linkedevents`) — a **free, open (CC-BY)** data feed published by the City of Helsinki that aggregates events from Helsinki, Espoo, Vantaa and many regional publishers. It is **not** a paid API.

| Source | Type | Notes |
| --- | --- | --- |
| Helsinki – Tapahtumat | **live** | Linked Events, `division=kunta:helsinki`, children keyword |
| Espoo – Tapahtumat | **live** | Linked Events, `division=kunta:espoo` |
| Vantaa – Tapahtumat | **live** | Linked Events, `division=kunta:vantaa` |
| Kirjastot / Libraries | **live** | Region-wide, filtered to library programming |
| Museot & lastenkulttuuri | **live** | Region-wide, filtered to museums / culture centres |
| Sipoo | **fixture / mock** | Sipoo is sparse in Linked Events — see [Known limitations](#-known-limitations). Clearly badged "fixture/mock" in the UI. |

> Per the brief: each source has its own scraper file; they all funnel through a shared `normalizeEvent()`, shared dedupe, shared date parser, and shared logging. Real page structure was inspected before wiring selectors (the Linked Events JSON schema was verified live). Where a real feed is unavailable (Sipoo), a clearly-labelled fixture scraper with sample data is used instead.

---

## 🌐 Web version (hosted)

Because the Linked Events API allows direct browser access (`Access-Control-Allow-Origin: *`), the whole app also runs as a **pure static website with no backend**: the page fetches fresh events live from the API every time you open it, so it's automatically up to date each morning. The Sipoo fixture is bundled at build time.

- **Live site:** deployed to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.
- **Run the web app locally:**
  ```bash
  npm install
  npm run web:dev      # dev server with hot reload
  npm run web:build    # static build into dist/
  npm run web:preview  # preview the production build
  ```
- The web build shares the exact same scraping / normalize / filter / dedupe pipeline as the desktop app (`src/main/scrapers/runner.ts`); only the data source wiring differs (client-side `fetch` + `localStorage` cache instead of Electron IPC + SQLite). Code lives in `src/web/`.

> The web version has no local SQLite (browsers can't use it); it caches the last results in `localStorage` instead. The desktop app remains the full-fat version with the SQLite cache.

## 🛠 Install

```bash
npm install
```

This also runs `electron-rebuild` for the native `better-sqlite3` module (needed so SQLite works inside Electron). On macOS you need Xcode Command Line Tools (`xcode-select --install`); on Linux, `build-essential` + `python3`.

## ▶️ Run the app

```bash
npm run dev
```

This launches the Electron desktop window with hot-reload. On first launch the cache is empty, so it kicks off a scrape automatically; after that, use **Refresh events**.

To build a production bundle:

```bash
npm run build
npm run preview
```

## ✅ Run the tests

```bash
npm test           # one-off
npm run test:watch # watch mode
```

Tests cover: Finnish date parsing & ISO→Helsinki conversion, deduplication, kids-relevance filtering, excluding old / out-of-window events, normalization, and a scraper test that runs against a **saved Linked Events fixture** (no network).

## 🔍 Run the scrapers without the GUI

Handy for debugging live scraping:

```bash
npm run scrape
```

Prints a per-source summary (raw / kept / errors / duration) and the first events found.

---

## ➕ Add a new scraper

1. Create `src/main/scrapers/myCity.ts` exporting a `Scraper`:

   ```ts
   import type { Scraper } from './types.js';
   import { normalizeEvent } from '../lib/normalizeEvent.js';

   export const myCityScraper: Scraper = {
     name: 'My Source',
     isMock: false, // true if returning fixture data
     async scrape(ctx) {
       // fetch HTML/JSON, then map each item through normalizeEvent(...)
       // return KidEvent[] — DO NOT filter/dedupe here, the orchestrator does that.
       return [];
     },
   };
   ```

   - For Linked Events-style sources, reuse `makeLinkedEventsScraper({ ... })`.
   - For HTML pages, use `cheerio` (already a dependency). **Inspect the real DOM first** and add a saved HTML fixture + test under `tests/`.
   - Use `ctx.todayISO` / `ctx.windowDays` for the date window, and `ctx.logger` for logs.

2. Register it in `src/main/scrapers/index.ts` by adding it to the `SCRAPERS` array.

3. Add a fixture-based test under `tests/scrapers/`.

That's it — relevance filtering, the 7-day window, dedupe, logging and persistence are all handled centrally.

### How filtering works

The orchestrator keeps an event only if it:
- has a real parsed date,
- overlaps the next **7 days** (ongoing multi-day events count),
- is **not** old (already ended),
- looks relevant for children/families (keyword match, child-inclusive audience age, or a kids tag), and
- is **not** adult-only.

Then duplicates are collapsed by content hash + a fuzzy (title + date) key, preferring richer/live records over sparse/mock ones.

---

## 🧱 Project structure

```
src/
  shared/types.ts          # KidEvent + shared types (no Node/Electron imports)
  main/
    index.ts               # Electron main process + IPC
    preload.ts             # contextBridge API exposed to the renderer
    db/database.ts         # SQLite (better-sqlite3)
    lib/                   # normalizeEvent, dedupe, dateParser, eventWindow, relevance, tags, logger
    scrapers/              # one file per source + index.ts (registry/orchestrator) + cli.ts
  renderer/                # React UI (App, EventCard, Filters, DebugPanel)
tests/                     # vitest + fixtures
```

---

## ⚠️ Known limitations

- **Sipoo is mock data.** Sipoo (Sibbo) is currently sparse in the Linked Events API and `sipoo.fi` has no clean event feed, so the Sipoo tab is populated from a fixture (`src/main/scrapers/fixtures/sipoo.sample.json`) and badged **fixture/mock**. See the `TODO` in `src/main/scrapers/sipoo.ts`.
- **Children keyword.** Live sources query the Linked Events children keyword (`yso:p4354`). Some family events not tagged with it may be missed; the relevance filter is the safety net. More YSO keywords can be added in `linkedEventsBase.ts`.
- **City coverage.** Espoo/Vantaa coverage depends on those cities publishing into the Helsinki Linked Events instance (verified working at build time, but volume varies).
- **Ongoing exhibitions** with very long end dates can appear in "this week"; they are genuine dated events so they are kept.
- The app shows events for the **next 7 days only**; there is no month/calendar view yet.
- No automated background refresh schedule yet — refresh is manual (or once on first launch).

## 📄 License

MIT. Event data via the Helsinki Region Linked Events API is licensed CC-BY 4.0 — attribute the City of Helsinki and contributing publishers.
