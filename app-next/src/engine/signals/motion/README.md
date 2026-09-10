# MotionProvider

This layer is a dumb native/fixture sensor pipe. It publishes source and reception timestamps for motion activity, cadence, and history; it never decides whether apps unlock.

Runtime-root `DetectionService` and `MotionAdapter` own the single policy path. Walking qualifies after three continuous seconds of medium-confidence walking/running **or** cadence of at least 80 steps/minute. Freshness is tracked per source: quiet change-driven classification is not sensor death while cadence remains fresh, while total supported-evidence silence becomes unknown after five seconds. The persisted walking reducer owns the one-shot 30-second-to-five-minute stop grace. Historical queries credit targets only and never manufacture current live relief.

`NativeMotionProvider` is used by supported native builds. Tests and demo scenarios use typed physical evidence with the same pure reducer; they do not fabricate public sessions or enforcement deadlines. Motion timing and background delivery remain physical-device gates.
