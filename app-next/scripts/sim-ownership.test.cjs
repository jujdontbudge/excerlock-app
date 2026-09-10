const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const helper = path.join(__dirname, 'sim.py');
test('headless helper requires an explicit simulator and never selects a historical default', () => {
  for (const value of ['', 'booted', 'not-a-uuid']) {
    const result = spawnSync('python3', [helper], {env:{...process.env, EXCERLOCK_SIM_UDID:value}, encoding:'utf8'});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Set EXCERLOCK_SIM_UDID/);
  }
  const result = spawnSync('python3', [helper], {env:{...process.env, EXCERLOCK_SIM_UDID:'00000000-0000-4000-8000-000000000001'}, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
});
