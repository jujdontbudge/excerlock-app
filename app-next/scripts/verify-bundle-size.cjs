const fs = require('node:fs');
// T15 says 4 MB: use decimal bytes, not a more permissive 4 MiB threshold.
const MAX_BUNDLE_BYTES = 4_000_000;
const HERMES_MAGIC = Buffer.from('c61fbc03c103191f', 'hex');
function verifyBundleSize(file) {
 const stat = fs.lstatSync(file);
 if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Bundle must be a regular unlinked file');
 const fd = fs.openSync(file, 'r');
 const header = Buffer.alloc(8);
 try { fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
 if (stat.size < 128 || !header.equals(HERMES_MAGIC)) throw new Error('Expected a packaged Hermes bytecode bundle');
 if (stat.size > MAX_BUNDLE_BYTES) throw new Error(`Hermes bundle ${stat.size} exceeds ${MAX_BUNDLE_BYTES} bytes`);
 return { bytes: stat.size, limit: MAX_BUNDLE_BYTES };
}
module.exports = { verifyBundleSize, MAX_BUNDLE_BYTES };
if (require.main === module) {
 try {
  if (process.argv.length !== 3) throw new Error('Usage: node verify-bundle-size.cjs /path/to/main.jsbundle');
  console.log(`BUNDLE SIZE PASS ${JSON.stringify(verifyBundleSize(process.argv[2]))}`);
 } catch (error) { console.error(`BUNDLE SIZE FAIL: ${error.message}`); process.exitCode = 1; }
}
