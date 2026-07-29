import { colors, gradients, radius, spacing, theme, typography } from "../theme";

describe("theme tokens", () => {
  it("carries the orange gradient background system", () => {
    expect(gradients.screen.colors[0]).toBe("#1A0F06");
    expect(gradients.screen.colors.at(-1)).toBe("#C2570A");
  });

  it("carries the proven dashboard gradient from the approved mockup", () => {
    expect(gradients.dashboard.colors[0]).toBe("#F98529");
    expect(gradients.dashboard.colors.at(-1)).toBe("#EB2E02");
    expect(gradients.dashboard.colors).toHaveLength(gradients.dashboard.locations.length);
  });

  it("runs every gradient top-to-bottom with monotonic stops", () => {
    for (const gradient of Object.values(gradients)) {
      expect(gradient.start).toEqual({ x: 0.5, y: 0 });
      expect(gradient.end).toEqual({ x: 0.5, y: 1 });
      expect(gradient.locations[0]).toBe(0);
      expect(gradient.locations.at(-1)).toBe(1);
      expect([...gradient.locations].sort((a, b) => a - b)).toEqual([...gradient.locations]);
    }
  });

  it("uses the ticket accents for primary actions", () => {
    expect(colors.primary).toBe("#F98529");
    expect(colors.primaryPressed).toBe("#EB2E02");
  });

  it("keeps cards translucent and borderless", () => {
    expect(colors.card).toMatch(/^rgba\(255, ?255, ?255, ?0\.08\)$/);
    expect(colors.cardElevated).toMatch(/^rgba\(255, ?255, ?255, ?0\.12\)$/);
    expect(colors).not.toHaveProperty("cardBorder");
  });

  it("keeps the energy accent off primary chrome", () => {
    expect(colors.energy).not.toBe(colors.primary);
  });

  it("exposes a 4pt spacing scale and a 12pt minimum radius", () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.gutter).toBe(16);
    for (const step of Object.values(spacing)) {
      expect(step % 4).toBe(0);
    }
    const roundedRadii = Object.entries(radius).filter(([name]) => name !== "pill");
    for (const [, value] of roundedRadii) {
      expect(value).toBeGreaterThanOrEqual(12);
    }
    expect(radius.pill).toBeGreaterThanOrEqual(999);
  });

  it("renders hero numerals in SF Rounded with tabular figures", () => {
    expect(typography.hero.fontFamily).toBe(typography.fonts.rounded);
    expect(typography.hero.fontSize).toBeGreaterThanOrEqual(72);
    expect(typography.hero.fontVariant).toContain("tabular-nums");
  });

  it("scales type from caption up to screen title", () => {
    expect(typography.caption.fontSize).toBe(13);
    expect(typography.body.fontSize).toBe(15);
    expect(typography.cardTitle.fontSize).toBe(17);
    expect(typography.screenTitle.fontSize).toBe(34);
  });

  it("assembles one frozen theme surface", () => {
    expect(theme).toEqual({ colors, gradients, radius, spacing, typography });
    expect(Object.isFrozen(theme)).toBe(true);
  });
});
