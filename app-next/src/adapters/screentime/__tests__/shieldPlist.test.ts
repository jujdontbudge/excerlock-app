import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ShieldCause, shieldContent } from '../../../domain/shieldContent';
import { UnlockHint } from '../../../domain/types';
import { NATIVE_CAUSE } from '../shieldPublisher';

/**
 * `ShieldContent.plist` is what the extension shows before the app has ever published a snapshot
 * into the app group, so its words have to be the words the domain would have published. The
 * guardrail suite checks the file is bundled and well formed; the copy itself is checked here,
 * where the domain can be imported.
 */
const targets = resolve(__dirname, '../../../../targets');
const readTarget = (...parts: string[]) => readFileSync(resolve(targets, ...parts), 'utf8');

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The plist has no nested dictionaries, so each cause is one flat block of string fields. */
function parseVariants(xml: string): Record<string, Record<string, string>> {
  const variants: Record<string, Record<string, string>> = {};
  for (const [, cause, body] of xml.matchAll(/<key>([^<]+)<\/key>\s*<dict>([\s\S]*?)<\/dict>/g)) {
    if (cause === undefined || body === undefined) continue;
    const fields: Record<string, string> = {};
    for (const [, key, value] of body.matchAll(
      /<key>([^<]+)<\/key>\s*<string>([\s\S]*?)<\/string>/g,
    )) {
      if (key === undefined || value === undefined) continue;
      fields[key] = value.replace(/&(\w+);/g, (whole, name: string) => ENTITIES[name] ?? whole);
    }
    variants[cause] = fields;
  }
  return variants;
}

/**
 * `balanceEmpty` belonged to the retired balance economy and is never published, so it falls back
 * to the plain locked copy. `lockWindow` ships no secondary label: the extension drops it there.
 */
const expected = (cause: ShieldCause, deepLink: string, secondaryActionLabel?: string) => {
  const content = shieldContent({ cause, goal: 'pending', canNotify: true });
  return {
    deepLink,
    primaryActionLabel: content.primary,
    secondaryActionLabel: secondaryActionLabel ?? content.secondary ?? '',
    subtitle: content.subtitle,
    title: content.title,
  };
};

describe('shield content plist', () => {
  it('ships the domain copy as the extension cold-start fallback', () => {
    expect(parseVariants(readTarget('ShieldConfiguration', 'ShieldContent.plist'))).toEqual({
      balanceEmpty: expected('locked', 'excerlock://'),
      fullLock: expected('locked', 'excerlock://locked-apps'),
      lockWindow: expected('lockWindow', 'excerlock://locked-apps', ''),
      walkAndScrollEnded: expected('walkingEnded', 'excerlock://'),
    });
  });

  it('maps every domain cause to a variant the plist declares', () => {
    const variants = Object.keys(parseVariants(readTarget('ShieldConfiguration', 'ShieldContent.plist')));
    expect(variants).toEqual(expect.arrayContaining(Object.values(NATIVE_CAUSE)));
  });

  it('keeps every publishable subtitle past the extension copy filter', () => {
    // ShieldContent.swift discards a subtitle containing any of these and falls back to the plist,
    // silently. The list is read from the Swift so a word added there fails here instead.
    const swift = readTarget('ShieldConfiguration', 'ShieldContent.swift');
    const declaration = /let forbidden = \[[^\]]*\]/.exec(swift);
    if (declaration === null) throw new Error('ShieldContent.swift no longer declares the filter');
    const forbidden = [...declaration[0].matchAll(/"([^"]+)"/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );
    expect(forbidden.length).toBeGreaterThan(0);

    const hints: (UnlockHint | undefined)[] = [
      undefined,
      { ruleId: 'r', action: 'walk', remaining: 1, goal: null, unit: null },
      { ruleId: 'r', action: 'arrive', remaining: null, goal: null, unit: null },
      ...['steps', 'minutes', 'km', 'mi'].map(
        (unit): UnlockHint => ({ ruleId: 'r', action: 'progress', remaining: 2500, goal: 10000, unit }),
      ),
    ];

    const discarded = (['locked', 'lockWindow', 'walkingEnded'] as const).flatMap((cause) =>
      hints.flatMap((hint) =>
        (['pending', 'met'] as const).flatMap((goal) =>
          [true, false]
            .map((canNotify) => shieldContent({ cause, hint, goal, canNotify }).subtitle)
            .filter((subtitle) => forbidden.some((word) => subtitle.toLowerCase().includes(word))),
        ),
      ),
    );

    expect(discarded).toEqual([]);
  });
});
