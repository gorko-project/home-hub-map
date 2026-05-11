## Fixes for Admin score inputs

### 1. Start score fields empty
In `src/pages/Admin.tsx`:
- Change `blankScores` so all six fields (`management`, `noise`, `value`, `location`, `condition`, `composite`) default to `""` instead of `"2.5"`.
- In `startEdit` (line ~223), when a building has no composite score, use `""` instead of `"2.5"`.
- `parseScore` already returns `null` for empty strings, and the submit path already passes those nulls through to `building_scores` / `composite_score`, so empty inputs save as null without further changes.
- The `StarsDisplay` next to each input will simply show 0 stars until the admin types a value (already handled by the existing `Number.isFinite` check).

### 2. Fix focus loss after typing one digit
Root cause: `ScoreInput` is declared **inside** the `Admin` component body (line 320). Every keystroke updates state, re-renders `Admin`, and creates a brand-new `ScoreInput` function reference. React then unmounts the old `<Input>` and mounts a new one, so the field loses focus after each character — exactly the "have to click back into the box" symptom.

Fix: move `ScoreInput` out of the `Admin` component so its identity is stable across renders.
- Extract it to a module-level component (top of the file, alongside `parseScore`) that takes `scores`, `setScores`, `label`, and `field` as props.
- Update the six call sites (lines 451–459) to pass `scores={scores}` and `setScores={setScores}`.
- Keep all existing input behavior (text input, decimal `inputMode`, comma→dot normalization, regex guard, `onBlur` formatting to one decimal, stars + "x.x / 5" readout).

No other behavior, styling, or business logic changes.
