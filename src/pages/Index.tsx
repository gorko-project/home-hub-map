import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_MAPS_API_KEY = "AIzaSyBWrTrOvyiPmQBPJnOt_grjBo1cJCGuWYA";
const MAP_ID = "apartmentmap_main";

type Building = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  composite_score: number | null;
  photo_url: string | null;
};

const Index = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);

  useEffect(() => {
    supabase
      .from("buildings")
      .select("id,name,slug,address,latitude,longitude,composite_score,photo_url")
      .eq("status", "published")
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setBuildings((data ?? []).filter((b) => b.latitude != null && b.longitude != null));
      });
  }, []);

  const center =
    buildings.length > 0
      ? { lat: Number(buildings[0].latitude), lng: Number(buildings[0].longitude) }
      : { lat: 40.7128, lng: -74.006 };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="fixed inset-0 top-16">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            mapId={MAP_ID}
            defaultCenter={center}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {buildings.map((b) => (
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
                <div className="min-w-[200px] space-y-2 p-1">
                  <h3 className="font-semibold text-base">{selected.name}</h3>
                  {selected.address && <p className="text-sm text-muted-foreground">{selected.address}</p>}
                  <p className="text-sm">
                    Score:{" "}
                    <span className="font-medium">
                      {selected.composite_score != null ? Number(selected.composite_score).toFixed(1) : "N/A"}
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
