# content

User-facing copy and typed option lists. No UI components.

`locale.ts` owns what the device tells us about formatting: language tag, 12/24-hour clock and first day of the week. Format numbers and dates through it, never through a hard-coded `'en-US'`; tests pin an en-US, 12-hour, Monday-start fixture in `jest.setup.ts`.
