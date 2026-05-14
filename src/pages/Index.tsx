/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { APIProvider, Map, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Search, X } from "lucide-react";
import homeMarker from "@/assets/home-marker.svg";
import { Navbar } from "@/components/Navbar";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { StarsDisplay } from "@/components/Stars";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_MAPS_API_KEY = "AIzaSyA7otCuVOVby8vCvbGr7F1qKFahE4AeCa4";

const HTMLMarker = ({
  position,
  onClick,
  zIndex,
  children,
}: {
  position: { lat: number; lng: number };
  onClick?: () => void;
  zIndex?: number;
  children: ReactNode;
}) => {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (!containerRef.current && typeof document !== "undefined") {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.transform = "translate(-50%, -100%)";
    el.style.cursor = "pointer";
    containerRef.current = el;
  }

  useEffect(() => {
    if (!map || !containerRef.current) return;
    const div = containerRef.current;
    if (zIndex != null) div.style.zIndex = String(zIndex);

    class Overlay extends google.maps.OverlayView {
      onAdd() {
        this.getPanes()!.floatPane.appendChild(div);
      }
      draw() {
        const proj = this.getProjection();
        if (!proj) return;
        const p = proj.fromLatLngToDivPixel(
          new google.maps.LatLng(position.lat, position.lng),
        );
        if (p) {
          div.style.left = `${p.x}px`;
          div.style.top = `${p.y}px`;
        }
      }
      onRemove() {
        if (div.parentNode) div.parentNode.removeChild(div);
      }
    }
    const overlay = new Overlay();
    overlay.setMap(map);
    return () => {
      overlay.setMap(null);
    };
  }, [map, position.lat, position.lng, zIndex]);

  useEffect(() => {
    const div = containerRef.current;
    if (!div || !onClick) return;
    const handler = (e: Event) => {
      e.stopPropagation();
      onClick();
    };
    div.addEventListener("click", handler);
    return () => div.removeEventListener("click", handler);
  }, [onClick]);

  if (!containerRef.current) return null;
  return createPortal(children, containerRef.current);
};

type Building = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  neighborhood: string | null;
  composite_score: number | null;
  photo_url: string | null;
};

type LatLng = { lat: number; lng: number };

const Index = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [coords, setCoords] = useState<Record<string, LatLng>>({});
  const [selected, setSelected] = useState<Building | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (!selected) { setSelectedPhoto(null); return; }
    let cancelled = false;
    supabase
      .from("building_photos")
      .select("url,is_primary,display_order")
      .eq("building_id", selected.id)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        setSelectedPhoto(data?.[0]?.url ?? selected.photo_url ?? null);
      });
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    if (!mapInstance) return;
    const zl = mapInstance.addListener("zoom_changed", () => {
      setZoom(mapInstance.getZoom() ?? 12);
    });
    const cl = mapInstance.addListener("click", () => setSelected(null));
    setZoom(mapInstance.getZoom() ?? 12);
    return () => { zl.remove(); cl.remove(); };
  }, [mapInstance]);

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
          <SearchBar
            query={query}
            setQuery={setQuery}
            onPick={setSearchPin}
            map={mapInstance}
            buildingMatches={filtered === buildings ? [] : filtered}
            onPickBuilding={(b) => {
              if (mapInstance && b.latitude != null && b.longitude != null) {
                mapInstance.panTo({ lat: Number(b.latitude), lng: Number(b.longitude) });
                mapInstance.setZoom(17);
              }
              setSelected(b);
            }}
          />

          <Map
            defaultCenter={center}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: "100%", height: "100%" }}
            styles={[
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
              { featureType: "poi.business", elementType: "all", stylers: [{ visibility: "off" }] },
              { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            ]}
          >
            <MapInstanceBridge onReady={setMapInstance} />
            <SearchPinMarker position={searchPin} />
            {!selected && buildings.map((b) => {
              const z = zoom;
              let iconSize = 10, scoreSize = 11, padding = "3px 7px", radius = 6;
              if (z >= 15 && z <= 16) { iconSize = 12; scoreSize = 13; padding = "4px 9px"; radius = 7; }
              else if (z >= 17 && z <= 18) { iconSize = 14; scoreSize = 15; padding = "5px 11px"; radius = 8; }
              else if (z > 18) { iconSize = 16; scoreSize = 17; padding = "6px 13px"; radius = 9; }

              let nameSize = 0;
              if (z === 15) nameSize = 13;
              else if (z === 16) nameSize = 15;
              else if (z === 17) nameSize = 17;
              else if (z >= 18) nameSize = 19;
              const showName = nameSize > 0;

              return (
                <HTMLMarker
                  key={b.id}
                  position={{ lat: Number(b.latitude), lng: Number(b.longitude) }}
                  onClick={() => setSelected(b)}
                  zIndex={1000}
                >
                  <div className="cursor-pointer flex flex-col items-center">
                    {showName && (
                      <span
                        className="whitespace-nowrap max-w-[260px] truncate text-center"
                        style={{
                          fontSize: nameSize,
                          fontWeight: 700,
                          color: "#1a1a1a",
                          textShadow: "0 1px 3px rgba(255,255,255,1)",
                          marginBottom: 4,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {b.name}
                      </span>
                    )}
                    <div
                      className="bg-white flex items-center gap-1 hover:scale-105"
                      style={{
                        border: "1.5px solid #f97316",
                        borderRadius: radius,
                        padding,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <svg width={iconSize} height={iconSize} viewBox="0 0 14 14" fill="none">
                        <path d="M7 1L1 6v7h4V9h4v4h4V6L7 1z" fill="#f97316" />
                      </svg>
                      <span
                        style={{
                          fontSize: scoreSize,
                          fontWeight: 500,
                          color: "#f97316",
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {b.composite_score != null ? Number(b.composite_score).toFixed(1) : "—"}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "4px solid transparent",
                        borderRight: "4px solid transparent",
                        borderTop: "5px solid #f97316",
                        marginTop: -1,
                        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
                      }}
                    />
                  </div>
                </HTMLMarker>
              );
            })}

            {selected && (
              <InfoWindow
                position={{ lat: Number(selected.latitude), lng: Number(selected.longitude) }}
                onCloseClick={() => setSelected(null)}
                pixelOffset={[0, -40]}
                zIndex={9999}
                headerDisabled
              >
                <div className="w-[260px] overflow-hidden rounded-xl bg-white" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                  <div className="relative">
                    {selectedPhoto ? (
                      <img src={selectedPhoto} alt={selected.name} className="w-full h-[140px] object-cover" />
                    ) : (
                      <div className="w-full h-[140px] bg-gray-200" />
                    )}
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setSelected(null)}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 hover:bg-white text-ink flex items-center justify-center shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-bold text-[16px] text-ink leading-tight">{selected.name}</h3>
                    {selected.address && (
                      <p className="text-[12px] text-ink-muted leading-snug">{selected.address}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-[13px] text-ink">
                      {selected.composite_score != null ? (
                        <>
                          <StarsDisplay value={Number(selected.composite_score)} size={14} />
                          <span className="font-semibold tabular-nums">{Number(selected.composite_score).toFixed(1)}</span>
                          <span className="text-ink-muted">/ 5</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">No rating yet</span>
                      )}
                    </div>
                    <Link
                      to={`/buildings/${selected.slug}`}
                      className="mt-2 block w-full text-center rounded-lg bg-ink text-white text-[13px] font-medium py-2 hover:bg-ink/90 transition-colors"
                    >
                      View details
                    </Link>
                  </div>
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
  buildingMatches,
  onPickBuilding,
}: {
  query: string;
  setQuery: (v: string) => void;
  onPick: (p: { lat: number; lng: number } | null) => void;
  map: google.maps.Map | null;
  buildingMatches: Building[];
  onPickBuilding: (b: Building) => void;
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
            if (e.target.value === "") onPick(null);
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
          className="pl-10 pr-10 h-11 rounded-full border-border"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              setPredictions([]);
              setShowSuggest(false);
              onPick(null);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showSuggest && (buildingMatches.length > 0 || predictions.length > 0) && (
        <div className="mt-2 rounded-xl bg-background shadow-lg border border-border overflow-hidden">
          {buildingMatches.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Buildings
              </div>
              {buildingMatches.slice(0, 5).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(b.name);
                    setShowSuggest(false);
                    onPickBuilding(b);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-start gap-2"
                >
                  <Search className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <span>
                    <span className="font-medium">{b.name}</span>
                    {b.neighborhood && (
                      <span className="text-muted-foreground"> · {b.neighborhood}</span>
                    )}
                  </span>
                </button>
              ))}
              {predictions.length > 0 && (
                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t border-border">
                  Addresses
                </div>
              )}
            </>
          )}
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
