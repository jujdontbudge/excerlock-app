#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error('usage: verify-no-linked-trace.cjs <artifact-or-directory> [...]');
  process.exit(2);
}
const markers = [
  'com.johansardar.excerlock.lab.linkedtrace',
  'excerlock-linked-trace',
  'LinkedTraceWriter',
  'LinkedTraceLifecyclePolicy',
  'linked-trace-active-v1.json',
  'motion_callback_native',
  'detector_persist',
  'canary_outcome',
];
const failures = [];
function inspect(file) {
  const stat = fs.statSync(file);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(file)) inspect(path.join(file, name));
    return;
  }
  if (!stat.isFile() || stat.size > 200 * 1024 * 1024) return;
  const data = fs.readFileSync(file);
  for (const marker of markers) {
    if (data.includes(Buffer.from(marker))) failures.push(`${file}: ${marker}`);
  }
}
for (const root of roots) inspect(path.resolve(root));
if (failures.length) {
  console.error(`Linked Recorder research marker(s) found in ordinary artifact:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`No Linked Recorder research markers found in ${roots.length} artifact path(s).`);
