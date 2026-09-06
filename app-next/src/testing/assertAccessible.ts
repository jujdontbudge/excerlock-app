type Node = { type: unknown; props: Record<string, unknown>; children?: unknown[] };
/** Audit rendered native nodes, in addition to the source lint that catches missing roles. */
export function assertAccessible(root: unknown) {
  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const n = value as Node,
      p = n.props ?? {},
      role = p.accessibilityRole;
    if (
      p.onClick ||
      p.onValueChange ||
      ['button', 'switch', 'checkbox', 'radio', 'tab', 'adjustable', 'progressbar'].includes(String(role))
    ) {
      expect(role).toBeTruthy();
      expect(typeof p.accessibilityLabel).toBe('string');
      expect(String(p.accessibilityLabel).trim().length).toBeGreaterThan(0);
    }
    if (role === 'progressbar') {
      const v = p.accessibilityValue as { now: number; max: number };
      expect(Number.isFinite(v.now)).toBe(true);
      expect(v.max).toBeGreaterThan(0);
    }
    if (role === 'adjustable') {
      expect(typeof (p.accessibilityValue as { text?: string })?.text).toBe('string');
      expect(p.accessibilityActions).toEqual(expect.arrayContaining([{ name: 'increment' }, { name: 'decrement' }]));
    }
    n.children?.forEach(walk);
  }
  walk(root);
}
