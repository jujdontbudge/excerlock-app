# Settings sections

Each component owns one group on the single Settings screen. Section-local async state and sheets stay with
the row that triggers them; `SettingsScreen` owns only composition and inventory order. User-facing copy is
centralized in `src/content/settings.ts`.
