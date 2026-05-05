import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";

type Building = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  neighborhood: string | null;
  photo_url: string | null;
  composite_score: number | null;
  admin_notes: string | null;
};

type Scores = {
  management: number | null;
  noise: number | null;
  value: number | null;
  location: number | null;
  condition: number | null;
};

const CATEGORIES: { key: keyof Scores; label: string }[] = [
  { key: "management", label: "Management" },
  { key: "noise", label: "Noise" },
  { key: "value", label: "Value" },
  { key: "location", label: "Location" },
  { key: "condition", label: "Condition" },
];

const ScoreBar = ({ label, score }: { label: string; score: number | null }) => {
  const pct = score != null ? (score / 10) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {score != null ? `${score}/10` : "—"}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const BuildingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: b } = await supabase
        .from("buildings")
        .select("id,name,slug,address,neighborhood,photo_url,composite_score,admin_notes")
        .eq("slug", slug)
        .maybeSingle();
      setBuilding(b);
      if (b) {
        const { data: s } = await supabase
          .from("building_scores")
          .select("management,noise,value,location,condition")
          .eq("building_id", b.id)
          .maybeSingle();
        setScores(s);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <Spinner className="min-h-screen" />;
  }

  if (!building) {
    return (
      <div className="p-8 space-y-4">
        <p>Building not found.</p>
        <Button asChild variant="outline">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to map</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[420px] w-full overflow-hidden bg-muted">
        {building.photo_url ? (
          <img
            src={building.photo_url}
            alt={building.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <Link
          to="/"
          className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-md hover:bg-background backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-lg">
            {building.name}
          </h1>
          <p className="mt-2 text-base md:text-lg text-white/90 drop-shadow">
            {building.address}
            {building.neighborhood ? ` · ${building.neighborhood}` : ""}
          </p>
        </div>
      </section>

      {/* Scores section */}
      <section className="container max-w-6xl py-10">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Admin Rating */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Admin Rating</h2>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums">
                {building.composite_score != null
                  ? Number(building.composite_score).toFixed(1)
                  : "—"}
              </span>
              <span className="text-xl text-muted-foreground">/10</span>
            </div>
            <div className="space-y-4">
              {CATEGORIES.map((c) => (
                <ScoreBar
                  key={c.key}
                  label={c.label}
                  score={scores ? (scores[c.key] as number | null) : null}
                />
              ))}
            </div>
          </div>

          {/* Editor Notes */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Editor Notes</h2>
            {building.admin_notes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {building.admin_notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Resident Reviews</h2>
          <p className="text-sm text-muted-foreground">
            No reviews yet. Reviews coming soon.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BuildingDetail;
