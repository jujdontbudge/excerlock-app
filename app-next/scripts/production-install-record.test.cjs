// The phone proof compares production ExcerLock's install record before and
// after installing the research Trace Lab. The research apps share production's
// bundle-id prefix, so the extraction must match the exact identifier or the
// proof reports a production mutation that never happened.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { PRODUCTION_BUNDLE_ID, productionInstallRecord } = require('./production-install-record.cjs');

// Verbatim shape of `xcrun devicectl device info apps` output captured from the
// lab phone: the production app first, then both research apps.
const APPS_LOG = [
  'Apps installed:',
  'com.johansardar.excerlock                | ExcerLock                  | 0.0.0 | 1 | …/72410929-6659-45D7-BAFC-8863FB0A7A01/ExcerLock.app/',
  'com.johansardar.excerlock.lab.linkedtrace| ExcerLock Trace Lab        | 1.0.0 | 1 | …/C7910519-7A62-4B66-9E9C-8039C6C036FB/ExcerLock.app/',
  'com.johansardar.excerlock.lab.walkingrecorder | Walking Recorder      | 1.0   | 1 | …/86484025-477C-4A23-B2E5-252C24D7D5E6/PhoneWalkingRecorder.app/',
  'com.johansardar.excerlock.monitor       | ExcerLock Monitor          | 0.0.0 | 1 | …/extension/',
  'com.johansardar.wda.xctrunner           | WebDriverAgentRunner-Runner| 1.0   | 1 | …/xctrunner/',
].join('\n');

function runCli(logText) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'production-install-record-')), 'apps.log');
  fs.writeFileSync(file, logText);
  try {
    return {
      status: 0,
      stdout: execFileSync(process.execPath, [path.join(__dirname, 'production-install-record.cjs'), file], { encoding: 'utf8' }),
    };
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? '' };
  }
}

test('selects only the exact production bundle identifier', () => {
  assert.deepEqual(productionInstallRecord(APPS_LOG), [APPS_LOG.split('\n')[1]]);
});

test('never selects a research app or a same-prefix extension identifier', () => {
  const selected = productionInstallRecord(APPS_LOG).join('\n');
  assert.ok(selected.includes(PRODUCTION_BUNDLE_ID));
  assert.ok(!selected.includes('.lab.'));
  assert.ok(!selected.includes('.monitor'));
});

test('the command line prints the same record and reports an absent app with no output', () => {
  const present = runCli(APPS_LOG);
  assert.equal(present.status, 0);
  assert.equal(present.stdout, `${APPS_LOG.split('\n')[1]}\n`);

  const absent = runCli(APPS_LOG.split('\n').filter((line) => !line.startsWith(PRODUCTION_BUNDLE_ID)).join('\n'));
  assert.equal(absent.status, 0);
  assert.equal(absent.stdout, '');
});
