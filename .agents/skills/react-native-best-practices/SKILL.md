---
name: react-native-best-practices
description: React Native animation, gesture, SVG and worklet patterns. Use when writing Reanimated, Gesture Handler, react-native-svg or react-native-worklets code.
license: MIT
---

# React Native best practices

Software Mansion's production patterns for the libraries ExcerLock ships. Read only the reference for the task.

| Reference | Use for |
|---|---|
| `references/animations/GUIDE.md` | Reanimated 4: shared values, `withSpring`/`withTiming`, layout animations, scroll-driven animation, performance. Route app motion through `app-next/src/motion` so Reduce Motion is respected. |
| `references/gestures/GUIDE.md` | Gesture Handler: tap, pan, swipe, long press, composition, Pressable. |
| `references/svg/GUIDE.md` | react-native-svg icons, charts and illustrations. |
| `references/multithreading/GUIDE.md` | react-native-worklets: UI-thread work, `scheduleOnUI`/`scheduleOnRN`, serializable values. |
