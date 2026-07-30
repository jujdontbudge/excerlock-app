import type { GlyphName } from "../icons";
import { colors, spacing, typography } from "../theme";

export type TabRoute = {
  /** The `app/(tabs)/` route file this tab renders. */
  readonly name: string;
  readonly title: string;
  readonly icon: GlyphName;
};

/**
 * The four plain tabs approved in `design/mockups/tabbar-4plain-v1.png`. No
 * centre button, no fifth slot — the route files map over this list.
 */
export const TAB_ROUTES = [
  { name: "index", title: "Home", icon: "home" },
  { name: "manage", title: "Manage", icon: "manage" },
  { name: "analysis", title: "Analysis", icon: "analysis" },
  { name: "settings", title: "Settings", icon: "settings" },
] as const satisfies readonly TabRoute[];

/**
 * Bar chrome for the four-plain-tab shell: no bar background at all, so each
 * screen's own gradient runs unbroken to the bottom edge behind the glyphs.
 */
/**
 * Height the floating tab bar occupies over the content beneath it.
 *
 * `tabBarStyle.position` is `absolute` so the gradient shows through, which
 * means the bar draws ON TOP of whatever a screen renders at its bottom edge.
 * Anything a user must tap down there has to reserve this much room or the tap
 * lands on a tab instead: observed 2026-07-30 on the simulator, where tapping
 * the condition builder's "Preview" button switched to the Analysis tab.
 *
 * This is the bar itself; add the bottom safe-area inset on top of it.
 */
export const FLOATING_TAB_BAR_HEIGHT = 49;

export function tabScreenOptions() {
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: "transparent" } as const,
    tabBarActiveTintColor: colors.textPrimary,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarLabelStyle: { ...typography.caption, fontWeight: "500" } as const,
    tabBarItemStyle: { paddingTop: spacing.sm } as const,
    tabBarStyle: {
      backgroundColor: "transparent",
      borderTopWidth: 0,
      elevation: 0,
      position: "absolute",
    } as const,
  };
}
