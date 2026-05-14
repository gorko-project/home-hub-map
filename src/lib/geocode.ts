// Google Maps Geocoding helper. Uses the same public browser key already used by the map.
export const GOOGLE_MAPS_API_KEY = "AIzaSyA7otCuVOVby8vCvbGr7F1qKFahE4AeCa4";

export type GeocodeResult = { lat: number; lng: number };

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address?.trim();
  if (!trimmed) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      trimmed,
    )}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK" || !json.results?.[0]) {
      console.warn("[geocode] no result for", trimmed, json.status, json.error_message);
      return null;
    }
    const loc = json.results[0].geometry?.location;
    if (loc == null) return null;
    return { lat: Number(loc.lat), lng: Number(loc.lng) };
  } catch (err) {
    console.error("[geocode] failed", err);
    return null;
  }
}
