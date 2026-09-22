# design-system

Shared visual tokens and components. No domain or fake-data imports.

`tokens.ts` is the single source of type, spacing, radius, control geometry, icon sizing, colour and motion; `illustrationTokens.ts` holds artwork-only values (composition offsets, brand marks, decorative palettes, pictogram sizes) and UI chrome may not import it. There are no other token modules. `design/UI-STYLE.md` names the scales and roles; `guardrails/design-system.test.ts` fails on a raw literal, a clipping line height, a failing contrast pair, a dead token, a second back or close affordance, or an ungated animation.

CloseButton is the one dismiss control: a brand-orange stroked cross on a 44pt target, used by OnboardingHeader, BottomSheet and the unlock screens. OnboardingHeader is the single inline back/progress header for every onboarding question and branch. Selection has one prop: `ChoiceRow` and `ActivityCard` take `emphasis` (`outline` by default, `solid` in onboarding and setup questions, which fills the selected choice orange with white label and glyph). SetupPresentation scopes the remaining setup layout to onboarding: centred labels and hidden heading support lines.

All 36 contracted components have interactive default/alternate examples in `__previews__`, reachable through `/dev?component=Name`. Components accept copy and callbacks; they do not read stores or call services. SVG chart coordinates are local drawing geometry; UI layout and colors come from tokens. Native controls are limited to ordinary switches, inputs and the time wheel.

References: the normative rebuild design system and the captured OtterLife strips. Reanimated API details were checked in its [official transition documentation](https://docs.swmansion.com/react-native-reanimated/docs/category/css-transitions/) and installed sources.

SettingsRow supports a stacked subtitle for long secondary content such as a gym address, while preserving one combined accessible navigation label.

BottomSheet expanded mode holds search interfaces at the tokenized maximum height; keyboard-aware maxHeight still constrains the scroll region. GymPicker uses this so filtering cannot move its heading, search field or footer.
