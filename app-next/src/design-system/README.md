# design-system

Shared visual tokens and components. No domain or fake-data imports.

All 36 contracted components have interactive default/alternate examples in `__previews__`, reachable through `/dev?component=Name`. Components accept copy and callbacks; they do not read stores or call services. SVG chart coordinates are local drawing geometry; UI layout and colors come from tokens. Native controls are limited to ordinary switches, inputs and the time wheel.

References: the normative rebuild design system and the captured OtterLife strips. Reanimated API details were checked in its [official transition documentation](https://docs.swmansion.com/react-native-reanimated/docs/category/css-transitions/) and installed sources.

SettingsRow supports a stacked subtitle for long secondary content such as a gym address, while preserving one combined accessible navigation label.

BottomSheet expanded mode holds search interfaces at the tokenized maximum height; keyboard-aware maxHeight still constrains the scroll region. GymPicker uses this so filtering cannot move its heading, search field or footer.
