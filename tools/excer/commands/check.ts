import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { checks } from '../checks/index.ts';
import type { Check } from '../checks/types.ts';
import { fromRoot } from '../lib/paths.ts';
import { flag, option, out, UsageError } from '../lib/shell.ts';

const ratchetFile = fromRoot('tools', 'excer', 'ratchet.json');

type Ratchets = Record<string, number>;

const loadRatchets = (): Ratchets => (existsSync(ratchetFile) ? (JSON.parse(readFileSync(ratchetFile, 'utf8')) as Ratchets) : {});

export const help = `excer check [--full] [--only a,b] [--list] [--json]

Static verification. Exit 0 means the shape is right. Ratchet counts (comments,
raw colours, raw type) may only fall; a lower count rewrites tools/excer/ratchet.json.
  --full      also run slow checks (Expo config secrets, expo install --check, release bundle)
  --only      run the named checks
  --list      list checks and why each exists
  --json      print machine-readable results`;

export async function checkCommand(args: string[]): Promise<number> {
  const full = flag(args, 'full');
  const list = flag(args, 'list');
  const json = flag(args, 'json');
  const only = option(args, 'only')?.split(',');
  if (args.length > 0) throw new UsageError(`unexpected arguments: ${args.join(' ')}`);

  if (list) {
    for (const check of checks) console.log(`${check.name.padEnd(24)}${check.tier === 'full' ? '[full] ' : ''}${check.why}`);
    return 0;
  }
  const unknown = (only ?? []).filter((name) => !checks.some((check) => check.name === name));
  if (unknown.length > 0) throw new UsageError(`unknown checks: ${unknown.join(', ')}. Run excer check --list`);

  const selected: Check[] = checks.filter((check) => (only ? only.includes(check.name) : full || check.tier === 'static'));
  const ratchets = loadRatchets();
  const report: { name: string; ok: boolean; detail: string[] }[] = [];

  for (const check of selected) {
    const started = Date.now();
    let result;
    try {
      result = await check.run();
    } catch (error) {
      result = { kind: 'fail' as const, problems: [error instanceof Error ? error.message : String(error)] };
    }
    const seconds = `${((Date.now() - started) / 1000).toFixed(1)}s`;
    if (result.kind === 'pass') {
      report.push({ name: check.name, ok: true, detail: result.note ? [result.note] : [] });
      if (!json) out.ok(`${check.name} ${seconds}${result.note ? `  ${result.note}` : ''}`);
    } else if (result.kind === 'fail') {
      report.push({ name: check.name, ok: false, detail: result.problems });
      if (!json) {
        out.fail(`${check.name} ${seconds}  ${check.why}`);
        out.detail(result.problems.join('\n'));
      }
    } else {
      const ceiling = ratchets[result.ratchet];
      if (ceiling === undefined || result.value < ceiling) ratchets[result.ratchet] = result.value;
      const ok = ceiling === undefined || result.value <= ceiling;
      const note = `${result.value}${ceiling === undefined ? ' (new ceiling)' : ` / ceiling ${ceiling}`}`;
      report.push({ name: check.name, ok, detail: ok ? [note] : [note, ...result.samples.slice(-20)] });
      if (!json) {
        if (ok) out.ok(`${check.name} ${seconds}  ${note}`);
        else {
          out.fail(`${check.name} ${seconds}  ${note}: ${check.why}`);
          out.detail(result.samples.join('\n'));
        }
      }
    }
  }

  const before = existsSync(ratchetFile) ? readFileSync(ratchetFile, 'utf8') : '';
  const after = `${JSON.stringify(Object.fromEntries(Object.entries(ratchets).sort()), null, 2)}\n`;
  if (after !== before) {
    writeFileSync(ratchetFile, after);
    if (!json) out.info('ratchet.json lowered; commit it so the gain sticks');
  }

  const failed = report.filter((item) => !item.ok);
  if (json) console.log(JSON.stringify({ ok: failed.length === 0, checks: report }, null, 2));
  else console.log(failed.length === 0 ? `\n${report.length} checks passed` : `\n${failed.length} of ${report.length} checks failed: ${failed.map((f) => f.name).join(', ')}`);
  return failed.length === 0 ? 0 : 1;
}
