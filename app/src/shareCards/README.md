# Share cards

**Contract.** `shareCards` owns the two public growth artifacts in PRD §3.13:
the milestone and weekly-recap templates, their Story (9:16) and Feed (1:1)
geometry, the preview ratio chooser, and the vendor-free boundary where a
rendered card will be captured and handed to iOS. Callers import only
`index.ts`; Analysis projects a rich `Recap` before crossing this boundary.

## Privacy floor

The template inputs are narrow projections in `ShareCardInput.ts`. They contain
only the exact aggregate/date facts a public card renders:

- recap: reclaimed minutes, active-days numerator and denominator, earn count,
  and week date range;
- milestone: milestone name, achievement number, and unlock month.

They do not contain a ledger day, condition record, source or gym name,
location, locked-app name, health reading, account identifier, user name, or
photo. The `ExcerLock` wordmark is rendered by each template and cannot be
removed through input data.

`__typechecks__/inputTypeLaw.ts` gives every forbidden category its own compiler
control. The source-name control was run once without `@ts-expect-error`; the
compiler rejected `topSourceName: "Gym visit"` because that field does not exist
on `RecapShareCardInput`. Analysis also keeps a render-level negative control:
its full local recap includes `topSourceName`, and the test once appended it to
the date projection and observed the captured canvas fail on the exact rendered
`"20–26 Jul · Gym visit"` leak.

## Templates and preview

`ShareCardFrame` is the single capture target. It paints the governed shared-UI
gradient and constrains the rendered card to `SHARE_CARD_FORMATS`: 1080×1920
Story or 1080×1080 Feed. The preview scales that same target to the available
screen space; its toggle changes the actual target ratio, not merely a label.

`MilestoneShareCard` accepts badge art as an injected React element. Ticket #74
owns that asset and its `design/STYLE.md` process; this module creates no badge
art. The milestone shelf/entry point is not built here, so only the template is
ready for that future caller.

`RecapShareCard` renders the three public facts only. Analysis row ③ may still
say `"7 earns · most from Gym visit"` inside the app, but `RecapShareAction`
projects only the count (`7`) for the public artifact.

## Capture and native-share boundary

`ShareCardModule` separates the two native operations:

1. `captureCard` receives the mounted target, template, and chosen ratio and
   returns typed PNG-file metadata;
2. `presentShareSheet` receives that file and reports the handoff outcome.

`MockShareCardModule` is deterministic. It returns a `mock://` PNG URI, records
both operations for tests, and reports `status: "simulated"`. It does not create
an image file and does not open a native share sheet.

`getShareCardModule()` in `accessor.ts` is the one module-level composition root
and the one-line swap point for the real adapter. The remaining slice is
honestly **not built**: install an approved view-capture library and native
sharing library through Expo MCP after its authorization is restored, implement
the adapter, and replace the accessor's `new MockShareCardModule()` constructor.
No dependency or `package.json` change belongs to this ticket while Expo MCP is
unavailable.

## Layout

| Path | Responsibility |
|---|---|
| `ShareCardInput.ts` | privacy-safe recap and milestone projection types |
| `ShareCardFormat.ts` | Story/Feed output geometry |
| `ShareCardModule.ts` | capture + native-share interface and result types |
| `MockShareCardModule.ts` | deterministic, explicitly simulated adapter |
| `accessor.ts` | sole adapter composition/swap point |
| `components/ShareCardFrame.tsx` | governed gradient capture target |
| `components/MilestoneShareCard.tsx` | badge-slot milestone template |
| `components/RecapShareCard.tsx` | three-fact recap template |
| `components/ShareCardPreviewSheet.tsx` | preview, ratio chooser, and handoff action |

## Tests

From the repository root:

```sh
npm run test:app -- shareCards
```

The suite covers both templates at both ratios, wordmark/content laws, the
compile-time privacy boundary, the deterministic boundary/accessor, preview
toggle behavior, and capture-to-handoff behavior. Analysis' `RecapCard` suite
covers the full rich-recap projection and live Share button.
