# ExcerLock Dashboard Prototype

Expo + React Native TypeScript prototype, implemented for Expo Web only during
this build. The app surface is a fixed `393×852` frame centered on a `#111`
browser page.

```bash
cd prototype
npm install
npx expo start --web
```

Open `http://localhost:8081` in Chrome. No iOS simulator is needed.

Acceptance artifacts:

- `acceptance/side-by-side.png` — footer-removed reference vs locked Chrome frame
- `acceptance/completion-760ms-web.png` — real pointer-triggered in-flight frame
- `acceptance/completed-web.png` — settled persistent end state
- `assets/icons/FOUNDRY.md` — every GPT Image prompt and validation result

