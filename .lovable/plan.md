## Root cause

`src/pages/Index.tsx` renders building markers from `filtered`, which excludes any building whose `name`/`neighborhood` doesn't contain the typed query. Typing an address empties `filtered`, so all black pins vanish.

## Fix

Edit `src/pages/Index.tsx`:

1. Render building markers from `buildings` (not `filtered`) so black pins always stay on the map.
2. Repurpose `filtered` to power a "Buildings" group at the top of the search-suggestions dropdown. Selecting a building suggestion pans the map to its coordinates and opens its InfoWindow.
3. Leave `SearchPinMarker` and Google Places autocomplete behavior unchanged.

Outcome: while typing or after picking an address, the red pin drops on the exact location and every black building pin remains visible.
