## Goal

Replace the current colored "Pin" building markers with custom Google Maps–style markers and react to zoom level.

## Edits — `src/pages/Index.tsx`

1. **Imports**: add `Home` to the `lucide-react` import.

2. **Track zoom level** in the `Index` component:
   - Add `const [zoom, setZoom] = useState(12);`
   - Add a `useEffect` that, when `mapInstance` is available, attaches a `zoom_changed` listener that calls `setZoom(mapInstance.getZoom() ?? 12)` and seeds the initial value. Clean up the listener on unmount.

3. **Replace the `<Pin>` inside each `<AdvancedMarker>`** with a custom stacked marker:

   ```
   [score pill]
   [white circle with orange home icon]
   [building name pill]   ← only when zoom >= 14
   ```

   - Outer wrapper: `flex flex-col items-center cursor-pointer transition-transform duration-150 hover:scale-110`.
   - Score: small white rounded-full pill with shadow, bold text, `mb-0.5`.
   - Icon bubble: 32px white circle (`h-8 w-8 rounded-full bg-white shadow-md ring-1 ring-black/5`) containing `<Home className="h-4 w-4" style={{ color: "#FF6B35" }} fill="#FF6B35" />`.
   - Name pill: rendered only when `zoom >= 14`; white rounded-full pill with shadow, `whitespace-nowrap truncate max-w-[140px]`.
   - Click handler stays on `AdvancedMarker` (`onClick={() => setSelected(b)}`) so the existing InfoWindow still opens.

No other files change. InfoWindow, search, and search pin behavior are untouched.
