# Before and After figures — provenance

The same character as `assets/condition-demo/frames`, redrawn in three new poses for the onboarding Before and After screen.

| Item | Value |
|---|---|
| Generator | fal.ai `fal-ai/nano-banana/edit`, key `FAL_KEY` from the Env Catalog. OpenAI (`tools/imagegen/gen.py`) had no credits on 2026-10-07; `fal-ai/nano-banana-pro/edit` had a queue of over 3,000 jobs and was cancelled. |
| Reference | `stand-phone.png`, `scroll-1.png` and `frames-free/stand-a.png` composited on flat magenta, 1024×512 |
| Prompts | `before-prompt.txt` (aspect 1:1), `after-prompt.txt` (aspect 16:9), sent verbatim |
| Raw output | 1024×1024 and 1344×768 on magenta, not kept |
| Keying | Alpha from magenta excess `min(R,B) − G` (opaque below 25, clear above 130), colour unmixed against the median corner colour scaled by pixel brightness, residual magenta spill removed, alpha averaged with a 3×3 min filter to drop the one-pixel fringe |
| Slicing | Figures split at empty alpha columns, trimmed to alpha, 6 px margin top and sides, feet on the bottom edge |
| Files | `before.png` (slumped on a grey sofa, scrolling, tired eyes and dark circles), `after-gym.png` (flexing, dumbbell in hand), `after-walk.png` (walking, thumbs up) |
| Verdict | ACCEPTED 2026-10-07 — same face, hair, outfit and flat grain style as the condition-demo frames |

## Girl variant

| Item | Value |
|---|---|
| Generator | fal.ai `fal-ai/nano-banana/edit`, same key |
| Edit targets | the raw magenta outputs of the boy figures above, so poses, sofa, dumbbell and outfit stay identical |
| Prompts | `girl-before-prompt.txt` (aspect 1:1), `girl-after-prompt.txt` (aspect 16:9), sent verbatim |
| Keying / slicing | same pipeline as above; the pink hair tie survives as salmon after spill removal |
| Files | `girl-before.png`, `girl-after-gym.png`, `girl-after-walk.png` — the same girl, long dark brown ponytail |
| Use | shown when the onboarding gender answer is Female; every other answer shows the boy |
| Verdict | ACCEPTED 2026-10-07 |
