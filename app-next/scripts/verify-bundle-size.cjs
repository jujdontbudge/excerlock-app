const fs = require('node:fs');
// User removed the numeric size gate on 2026-09-10. Retain artifact validation and size reporting.
const HERMES_MAGIC = Buffer.from('c61fbc03c103191f', 'hex');
function verifyBundleSize(file) {
 const stat = fs.lstatSync(file);
 if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Bundle must be a regular unlinked file');
 const fd = fs.openSync(file, 'r');
 const header = Buffer.alloc(8);
 try { fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
 if (stat.size < 128 || !header.equals(HERMES_MAGIC)) throw new Error('Expected a packaged Hermes bytecode bundle');
 return { bytes: stat.size, limit: null };
}
module.exports = { verifyBundleSize };
if (require.main === module) {
 try {
  if (process.argv.length !== 3) throw new Error('Usage: node verify-bundle-size.cjs /path/to/main.jsbundle');
  console.log(`HERMES ARTIFACT PASS (size informational) ${JSON.stringify(verifyBundleSize(process.argv[2]))}`);
 } catch (error) { console.error(`HERMES ARTIFACT FAIL: ${error.message}`); process.exitCode = 1; }
}
