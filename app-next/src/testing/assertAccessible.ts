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
function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(text).join(' ');
  return value && typeof value === 'object' ? text((value as Node).children) : '';
}
const describe = (n: Node) => `<${String(n.type)} testID=${String(n.props?.testID)} "${text(n.children).trim().slice(0, 60)}">`;
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
    // A read-only, non-accessible input is a display (the ticking number); its labelled parent speaks.
    const input = n.type === 'TextInput' && p.editable !== false && p.accessible !== false;
    if (control || input) {
      if (control && !role) throw new Error(`${describe(n)} has no accessibility role`);
      if (typeof p.accessibilityLabel !== 'string' || !p.accessibilityLabel.trim())
        throw new Error(`${role || 'text input'} ${describe(n)} has no accessibility label`);
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
