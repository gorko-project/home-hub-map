/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_MAPS_API_KEY = "AIzaSyA7otCuVOVby8vCvbGr7F1qKFahE4AeCa4";
const MAP_ID = "apartmentmap_main";

type Building = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  composite_score: number | null;
  photo_url: string | null;
};

const Index = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    supabase
      .from("buildings")
      .select("id,name,slug,address,neighborhood,latitude,longitude,composite_score,photo_url")
      .eq("status", "published")
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setBuildings((data ?? []).filter((b) => b.latitude != null && b.longitude != null));
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.neighborhood ?? "").toLowerCase().includes(q),
    );
  }, [buildings, query]);

  const center = { lat: 40.7, lng: -74.1 };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="fixed inset-0 top-14">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Spinner />
          </div>
        )}

        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
          <SearchBar query={query} setQuery={setQuery} onPick={setSearchPin} map={mapInstance} />

          <Map
            mapId={MAP_ID}
            defaultCenter={center}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: "100%", height: "100%" }}
          >
            <MapInstanceBridge onReady={setMapInstance} />
            <SearchPinMarker position={searchPin} />
            {filtered.map((b) => (
              <AdvancedMarker
                key={b.id}
                position={{ lat: Number(b.latitude), lng: Number(b.longitude) }}
                onClick={() => setSelected(b)}
              >
                <Pin background="hsl(var(--primary))" borderColor="hsl(var(--primary))" glyphColor="hsl(var(--primary-foreground))">
                  <span className="text-xs font-bold">
                    {b.composite_score != null ? Number(b.composite_score).toFixed(1) : "—"}
                  </span>
                </Pin>
              </AdvancedMarker>
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: Number(selected.latitude), lng: Number(selected.longitude) }}
                onCloseClick={() => setSelected(null)}
                pixelOffset={[0, -40]}
              >
                <div className="min-w-[220px] max-w-[260px] space-y-2 p-1">
                  {selected.photo_url ? (
                    <img src={selected.photo_url} alt={selected.name} className="w-full h-32 object-cover rounded" />
                  ) : (
                    <div className="w-full h-32 rounded bg-muted" />
                  )}
                  <h3 className="font-semibold text-base">{selected.name}</h3>
                  {selected.address && <p className="text-sm text-muted-foreground">{selected.address}</p>}
                  <p className="text-sm">
                    Score:{" "}
                    <span className="font-medium">
                      {selected.composite_score != null ? `${Number(selected.composite_score).toFixed(1)}/10` : "N/A"}
                    </span>
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link to={`/buildings/${selected.slug}`}>View details</Link>
                  </Button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </main>
    </div>
  );
};

const SearchBar = ({
  query,
  setQuery,
  onPick,
  map,
}: {
  query: string;
  setQuery: (v: string) => void;
  onPick: (p: { lat: number; lng: number } | null) => void;
  map: google.maps.Map | null;
}) => {
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    serviceRef.current = new placesLib.AutocompleteService();
    tokenRef.current = new placesLib.AutocompleteSessionToken();
    const div = document.createElement("div");
    placesServiceRef.current = new placesLib.PlacesService(div);
  }, [placesLib]);

  useEffect(() => {
    if (!serviceRef.current || !query.trim()) {
      setPredictions([]);
      return;
    }
    const handle = setTimeout(() => {
      serviceRef.current!.getPlacePredictions(
        { input: query, sessionToken: tokenRef.current ?? undefined },
        (preds) => setPredictions(preds ?? []),
      );
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const searchExactLocation = ({ placeId, address, nextQuery }: { placeId?: string; address?: string; nextQuery?: string }) => {
    if (nextQuery) setQuery(nextQuery);
    setShowSuggest(false);
    if (!map || !placeId || !placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId, fields: ["geometry", "formatted_address", "name"] },
      (place, status) => {
        const loc = place?.geometry?.location;
        const viewport = place?.geometry?.viewport;

        if (status === google.maps.places.PlacesServiceStatus.OK && loc) {
          const pos = { lat: loc.lat(), lng: loc.lng() };
          onPick(pos);
          setQuery(nextQuery ?? place.formatted_address ?? place.name ?? query);

          if (viewport) map.fitBounds(viewport);
          else {
            map.panTo(pos);
            map.setZoom(18);
          }
        }

        if (placesLib) tokenRef.current = new placesLib.AutocompleteSessionToken();
      },
    );
  };

  const choose = (p: google.maps.places.AutocompletePrediction) => {
    searchExactLocation({ placeId: p.place_id, nextQuery: p.description });
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[min(420px,calc(100%-2rem))]">
      <div className="relative shadow-lg rounded-full bg-background">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggest(true);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();

            const trimmed = query.trim();
            if (!trimmed) return;

            if (predictions[0]) {
              choose(predictions[0]);
            }
          }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="Search address, building, or neighborhood…"
          className="pl-10 pr-4 h-11 rounded-full border-border"
        />
      </div>
      {showSuggest && predictions.length > 0 && (
        <div className="mt-2 rounded-xl bg-background shadow-lg border border-border overflow-hidden">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-start gap-2"
            >
              <Search className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span>{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MapInstanceBridge = ({ onReady }: { onReady: (map: google.maps.Map | null) => void }) => {
  const map = useMap();

  useEffect(() => {
    onReady(map ?? null);
  }, [map, onReady]);

  return null;
};

const SearchPinMarker = ({ position }: { position: { lat: number; lng: number } | null }) => {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        clickable: false,
        zIndex: 1000,
      });
    }

    if (position) {
      markerRef.current.setMap(map);
      markerRef.current.setPosition(position);
    } else {
      markerRef.current.setMap(null);
    }

    return () => undefined;
  }, [map, position]);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, []);

  return null;
};

export default Index;
