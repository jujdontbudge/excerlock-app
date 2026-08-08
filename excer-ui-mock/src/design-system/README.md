# Design system

This module is the only source of ExcerLock visual geometry. Feature screens
import from `@/design-system`; they should not introduce new colors, radii,
button shapes, or card translucency.

## Public interface

`index.ts` exports:

- foundation: `tokens`, `colors`, `gradients`, `space`, `layout`, `radius`,
  `motion`, and `type`;
- scaffolds: `GradientScreen`, `SheetFrame`, `BottomTabBar`, and the
  preview-only `StatusBarMock`;
- controls: `PressableScale`, `PillButton`, `IconChip`, `SegmentedControl`,
  `SwitchRow`, and `SettingsRow`;
- modal boundary: `AccessibleModal` and `AccessibleModalTitle`;
- surfaces and domain visuals: `PillowCard`, `HeroLock`, `ConditionCard`, and
  `LiveRing`;
- data visuals: `ChartBar`, `BarChart`, `StackedBar`, `TrendChart`, `HeatMap`,
  `HeatMapCell`, and `BreakdownCard`.

Every prop interface and discriminated model is exported by the same barrel.

## Composition rules

- Start each native page with `GradientScreen`. Use `home` only for Home and
  direct Home previews; prefer `content`, `detail`, or `night` elsewhere.
- The root Router layout owns `GestureHandlerRootView` and `SafeAreaProvider`.
  `GradientScreen`, `SheetFrame`, and `BottomTabBar` consume safe-area context.
- Use `PressableScale` for custom taps. It uses Gesture Handler and a Reanimated
  CSS transition, preserves a 44pt target, and visibly disables motion when the
  action is disabled. Do not wrap it in a React Native touchable.
- Use the native `Switch` only through `SwitchRow`. The row itself is not a
  competing press target.
- `StatusBarMock` exists for static preview fixtures. Native app screens use the
  real status bar.
- Use `AccessibleModal` for in-screen overlays. It traps the accessibility view,
  focuses or announces `AccessibleModalTitle`, closes through native request and
  accessibility-escape paths, and restores an explicit or fallback focus target
  (with a dismissal announcement as its final fallback).
- `HeroLock` uses the approved separate `lock-body.png` and
  `lock-shackle.png` runtime assets so the shackle can open without swapping in
  unrelated art.

## ConditionCard seam

`ConditionCard` is a discriminated union:

```tsx
<ConditionCard
  variant="event"
  title="Finish a workout"
  banner={require('../../assets/banners/gym-sunset-gym.png')}
  status="eligible"
  onAction={completeWorkout}
/>

<ConditionCard
  variant="state"
  title="Walking"
  banner={require('../../assets/banners/walk-city-sidewalk.png')}
  status="active"
/>

<ConditionCard
  variant="rate"
  title="Today’s steps → screen time"
  banner={require('../../assets/banners/walk-park-path.png')}
  sourceValue="6,240 steps today"
  earnedValue="2h 05m earned"
  ratioLabel="500 steps = 10 min"
  progress={0.62}
/>
```

Only event cards and ended state cards expose an explicit CTA. The card shell
is never a giant action. Active walking explicitly says **Balance drains
normally**. Rate cards have no cap, claim, or CTA.

## Accessibility and charts

Controls expose semantic roles/states and keep at least a 44pt target. The rate
meter and `LiveRing` expose numeric progress. Chart points, stacked segments,
and heat-map cells expose their exact values or date-state labels rather than
relying on color or artwork alone.

Visual fidelity is verified with route screenshots. The retained test seam in
`__tests__/ConditionCard.test.tsx` verifies the three public variants and the
event action boundary; it does not snapshot implementation details.
