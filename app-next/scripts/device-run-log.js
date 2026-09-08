'use strict';
/**
 * Parser for a pulled diagnostics log.
 *
 * Two line shapes are accepted, because the on-device recorder (`DiagnosticsLog.toText()`) writes
 * tab-separated lines and a future exporter may write JSON Lines:
 *
 *   <atMs>\t<event>\t<json data>
 *   {"atMs":<number>,"event":"<name>","data":{...}}
 *
 * Blank lines are ignored. A malformed line never aborts a run: it is counted and reported, and the
 * rest of the log is still verified.
 */

function parseLog(text) {
  const entries = [];
  const malformed = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === '') return;
    const entry = parseLine(line);
    if (entry === null) malformed.push(index + 1);
    else entries.push(entry);
  });
  entries.sort((a, b) => a.atMs - b.atMs);
  return { entries, malformed };
}

function parseLine(line) {
  if (line.startsWith('{')) {
    try {
      const record = JSON.parse(line);
      return normalise(record.atMs, record.event, record.data);
    } catch {
      return null;
    }
  }
  const parts = line.split('\t');
  if (parts.length < 2) return null;
  const [atMs, event, ...rest] = parts;
  let data = {};
  if (rest.length > 0) {
    try {
      data = JSON.parse(rest.join('\t'));
    } catch {
      return null;
    }
  }
  return normalise(Number(atMs), event, data);
}

function normalise(atMs, event, data) {
  if (typeof atMs !== 'number' || Number.isNaN(atMs)) return null;
  if (typeof event !== 'string' || event.length === 0) return null;
  return Object.freeze({ atMs, event, data: data && typeof data === 'object' ? data : {} });
}

/** An instant inside `data` may be an ISO string or epoch milliseconds. */
function ms(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // A bare number is epoch milliseconds; Date.parse would read "1234" as the year 1234.
    if (/^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return NaN;
}

module.exports = { parseLog, parseLine, ms };
