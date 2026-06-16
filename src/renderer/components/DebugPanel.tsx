import React from 'react';
import type { ScraperRunLog } from '@shared/types';

export function DebugPanel({ logs }: { logs: ScraperRunLog[] }): React.JSX.Element {
  const errorCount = logs.filter((l) => l.error).length;
  return (
    <details className="debug" open={errorCount > 0}>
      <summary>
        🛠️ Scraper debug — {logs.length} sources
        {errorCount > 0 ? ` · ${errorCount} with errors` : ' · all OK'}
      </summary>
      <table className="debug-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Raw</th>
            <th>Kept</th>
            <th>ms</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.sourceName}>
              <td>
                {l.sourceName} {l.isMock && <span className="pill-mock">mock</span>}
              </td>
              <td>{l.rawCount}</td>
              <td>{l.keptCount}</td>
              <td>{l.durationMs}</td>
              <td>
                {l.error ? (
                  <span className="debug-err">⚠ {l.error}</span>
                ) : (
                  <span className="debug-ok">✓ ok</span>
                )}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5}>No runs yet — hit “Refresh events”.</td>
            </tr>
          )}
        </tbody>
      </table>
    </details>
  );
}
