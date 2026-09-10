// Run against the COMPLETE actual Expo export, not a hand-authored manifest.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || 'dist/ship-production-check');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'metadata.json'), 'utf8'));
const bundlePath = path.join(root, metadata.fileMetadata.ios.bundle);
const bundle = fs.readFileSync(bundlePath, 'utf8');
const map = JSON.parse(fs.readFileSync(`${bundlePath}.map`, 'utf8'));
assert.ok(map.sources.some((source) => /features\/home\/HomeScreen\.tsx$/.test(source)), 'Not a complete ExcerLock application map');
assert.ok(!map.sources.some((source) => /(?:app\/dev\.tsx|features\/dev\/)/.test(source)), 'Dev modules included in export');
assert.ok(!bundle.includes('./dev.tsx'), 'Dev route present in compiled router context');
assert.ok(!bundle.includes('features/dev/DevRoute'), 'Dev implementation present in bundle');
console.log(`Verified: ${map.sources.length} sources; dev route and implementation absent from actual iOS export.`);
