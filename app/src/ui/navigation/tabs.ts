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
