import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_MAPS_API_KEY = "AIzaSyBWrTrOvyiPmQBPJnOt_grjBo1cJCGuWYA";
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
        {/* Floating search bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[min(420px,calc(100%-2rem))]">
          <div className="relative shadow-lg rounded-full bg-background">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or neighborhood…"
              className="pl-10 pr-4 h-11 rounded-full border-border"
            />
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Spinner />
          </div>
        )}

        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            mapId={MAP_ID}
            defaultCenter={center}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
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
                    <img
                      src={selected.photo_url}
                      alt={selected.name}
                      className="w-full h-32 object-cover rounded"
                    />
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

export default Index;
