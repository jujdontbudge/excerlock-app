import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/measure-startup.sh');

test('missing option value exits with usage status', () => {
  const result = spawnSync(script, ['--trace'], { encoding: 'utf8' });
  expect(result.status).toBe(64);
  expect(result.stderr).toContain('usage: measure-startup.sh');
});

test('accepts an xctrace package directory as input', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'measure-startup-'));
  const trace = path.join(dir, 'capture.trace');
  const bin = path.join(dir, 'bin');
  const output = path.join(dir, 'output');
  const calls = path.join(dir, 'xcrun-calls');
  mkdirSync(trace);
  mkdirSync(bin);
  const xcrun = path.join(bin, 'xcrun');
  writeFileSync(xcrun, `#!/bin/bash\nprintf '%s\\n' "$*" >> "$CALLS"\nout=\${!#}\nif [[ "$*" == *" --xpath "* ]]; then\n  printf '%s\\n' '<trace><row name="AppDelegateEntry" timestamp="10"/><row name="FirstReactChildMount" timestamp="10.4"/><row name="InteractiveHome" timestamp="10.9"/></trace>' > "$out"\nelse\n  printf '%s\\n' '<trace/>' > "$out"\nfi\n`);
  chmodSync(xcrun, 0o755);

  const result = spawnSync(script, ['--trace', trace, '--xpath', '/trace-toc/run', '--output', output], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALLS: calls },
  });

  expect(result.status).toBe(0);
  expect(readFileSync(calls, 'utf8')).toContain(`xctrace export --input ${trace}`);
});
