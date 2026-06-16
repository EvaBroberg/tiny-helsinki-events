// SQLite persistence via better-sqlite3. This module takes the db file path as
// an argument (it does not import Electron) so it can be unit-tested with an
// in-memory or temp database.

import Database from 'better-sqlite3';
import type { City, KidEvent, Price, Tag } from '@shared/types';

export type DB = Database.Database;

export function openDatabase(path: string): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      startDate   TEXT NOT NULL,
      endDate     TEXT,
      startTime   TEXT,
      location    TEXT,
      city        TEXT NOT NULL,
      sourceName  TEXT NOT NULL,
      sourceUrl   TEXT NOT NULL,
      eventUrl    TEXT NOT NULL,
      ageRange    TEXT,
      priceText   TEXT,
      price       TEXT NOT NULL,
      tags        TEXT NOT NULL,
      indoor      INTEGER,
      imageUrl    TEXT,
      scrapedAt   TEXT NOT NULL,
      contentHash TEXT NOT NULL,
      isMock      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_startDate ON events(startDate);
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  location: string | null;
  city: string;
  sourceName: string;
  sourceUrl: string;
  eventUrl: string;
  ageRange: string | null;
  priceText: string | null;
  price: string;
  tags: string;
  indoor: number | null;
  imageUrl: string | null;
  scrapedAt: string;
  contentHash: string;
  isMock: number;
}

function rowToEvent(r: EventRow): KidEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    startDate: r.startDate,
    endDate: r.endDate,
    startTime: r.startTime,
    location: r.location,
    city: r.city as City,
    sourceName: r.sourceName,
    sourceUrl: r.sourceUrl,
    eventUrl: r.eventUrl,
    ageRange: r.ageRange,
    priceText: r.priceText,
    price: r.price as Price,
    tags: JSON.parse(r.tags) as Tag[],
    indoor: r.indoor === null ? null : r.indoor === 1,
    imageUrl: r.imageUrl,
    scrapedAt: r.scrapedAt,
    contentHash: r.contentHash,
    isMock: r.isMock === 1,
  };
}

/** Replace the entire events table with a fresh set (atomic). */
export function replaceEvents(db: DB, events: KidEvent[]): void {
  const insert = db.prepare(`
    INSERT INTO events (
      id, title, description, startDate, endDate, startTime, location, city,
      sourceName, sourceUrl, eventUrl, ageRange, priceText, price, tags, indoor,
      imageUrl, scrapedAt, contentHash, isMock
    ) VALUES (
      @id, @title, @description, @startDate, @endDate, @startTime, @location, @city,
      @sourceName, @sourceUrl, @eventUrl, @ageRange, @priceText, @price, @tags, @indoor,
      @imageUrl, @scrapedAt, @contentHash, @isMock
    )
  `);

  const tx = db.transaction((rows: KidEvent[]) => {
    db.prepare('DELETE FROM events').run();
    for (const e of rows) {
      insert.run({
        ...e,
        tags: JSON.stringify(e.tags),
        indoor: e.indoor === null ? null : e.indoor ? 1 : 0,
        isMock: e.isMock ? 1 : 0,
      });
    }
  });
  tx(events);
}

export function getAllEvents(db: DB): KidEvent[] {
  const rows = db.prepare('SELECT * FROM events ORDER BY startDate, startTime').all() as EventRow[];
  return rows.map(rowToEvent);
}

export function setMeta(db: DB, key: string, value: string): void {
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

export function getMeta(db: DB, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}
