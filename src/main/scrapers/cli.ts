// Standalone CLI to run all scrapers without launching Electron. Useful for
// verifying live scraping and debugging selectors.
//
//   npm run scrape
//
import { runAllScrapers } from './index.js';

async function main() {
  const { events, logs } = await runAllScrapers();

  console.log('\n================ SCRAPER RUN SUMMARY ================');
  for (const l of logs) {
    const status = l.error ? `ERROR: ${l.error}` : `raw=${l.rawCount} kept=${l.keptCount}`;
    console.log(
      `  ${l.isMock ? '[mock] ' : ''}${l.sourceName.padEnd(48)} ${status}  (${l.durationMs}ms)`,
    );
  }
  console.log(`\nTotal events after dedup: ${events.length}`);
  console.log('\n---- First 10 events ----');
  for (const e of events.slice(0, 10)) {
    console.log(
      `  • ${e.startDate}${e.startTime ? ' ' + e.startTime : ''}  [${e.city}] ${e.title}` +
        `${e.isMock ? ' (mock)' : ''}  {${e.tags.join(',')}}`,
    );
  }
  console.log('=====================================================\n');
}

main().catch((err) => {
  console.error('Scrape CLI failed:', err);
  process.exit(1);
});
