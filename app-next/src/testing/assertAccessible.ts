import { ReactTestRendererJSON } from 'react-test-renderer';
type Node = { type: unknown; props: Record<string, unknown>; children?: unknown[] };
const controlRoles = [
  'button',
  'switch',
  'checkbox',
  'radio',
  'tab',
  'adjustable',
  'progressbar',
  'link',
  'imagebutton',
  'togglebutton',
  'menuitem',
  'slider',
  'spinbutton',
  'search',
  'combobox',
];
/** Host views VoiceOver focuses on its own, so they need no `accessible` flag. */
const nativelyFocusable = new Set(['Text', 'TextInput', 'RCTSwitch', 'RCTSlider', 'RCTSegmentedControl']);
/**
 * Audit rendered native nodes, in addition to the source lint that catches missing roles: every
 * control carries a role, a non-empty label and (unless it is text) the `accessible` flag VoiceOver
 * needs to focus it; progress and adjustable roles expose a value; text inputs are labelled.
 */
export function assertAccessible(root: ReactTestRendererJSON | ReactTestRendererJSON[] | null | unknown) {
  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const n = value as Node,
      p = n.props ?? {},
      role = String(p.accessibilityRole ?? ''),
      control = Boolean(p.onClick || p.onValueChange) || controlRoles.includes(role);
    if (control || n.type === 'TextInput') {
      if (control) expect(role).toBeTruthy();
      expect(typeof p.accessibilityLabel).toBe('string');
      expect(String(p.accessibilityLabel).trim().length).toBeGreaterThan(0);
    }
    if (control && !nativelyFocusable.has(String(n.type)) && p.accessible !== true && p.accessibilityElementsHidden !== true)
      throw new Error(`${role || 'control'} "${String(p.accessibilityLabel)}" is not accessible, so VoiceOver cannot focus it`);
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
