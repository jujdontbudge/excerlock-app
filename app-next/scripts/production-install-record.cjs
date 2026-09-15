#!/usr/bin/env node
// Extracts production ExcerLock's install record from `xcrun devicectl device
// info apps` output for the standalone device proof.
//
// The research apps deliberately share production's bundle-id prefix
// (`com.johansardar.excerlock.lab.*`), so a substring or prefix match would put
// lab installs into the proof's before/after comparison and report a mutation
// the proof never made. Only a complete identifier token counts as the
// production record, and the lab apps (and any `com.johansardar.excerlock.monitor`
// style extension identifier) are never part of it.
//
// Usage: production-install-record.cjs <device-apps-log> [more-logs...]
//   Prints the matching lines, or nothing when production ExcerLock is absent.
/* global module, process, require */
const fs = require('node:fs');
const path = require('node:path');

const PRODUCTION_BUNDLE_ID = 'com.johansardar.excerlock';
// An identifier in devicectl's table is followed by whitespace or the end of the
// line (`com.johansardar.excerlock | ExcerLock | 1.0.0`); a research app continues
// with `.lab`. `-` and `_` are valid identifier characters too, so they cannot
// end a production match either.
const IDENTIFIER_END = '[^A-Za-z0-9._-]';
const productionRecord = new RegExp(
  `(^|${IDENTIFIER_END})${PRODUCTION_BUNDLE_ID.replace(/\./g, '\\.')}($|${IDENTIFIER_END})`,
);

/** The lines of one apps log that belong to the exact production bundle id. */
function productionInstallRecord(text) {
  return String(text)
    .split('\n')
    .filter((line) => productionRecord.test(line));
}

function main(argv) {
  const files = argv.slice(2);
  if (!files.length) {
    console.error('usage: production-install-record.cjs <device-apps-log> [more-logs...]');
    return 2;
  }
  for (const file of files) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      console.error(`not a readable apps log: ${path.resolve(file)}`);
      return 2;
    }
    const lines = productionInstallRecord(fs.readFileSync(file, 'utf8'));
    if (lines.length) process.stdout.write(`${lines.join('\n')}\n`);
  }
  return 0;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { PRODUCTION_BUNDLE_ID, productionInstallRecord };
