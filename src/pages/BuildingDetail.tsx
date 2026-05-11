import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarsDisplay, StarsInput } from "@/components/Stars";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Building = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  neighborhood: string | null;
  photo_url: string | null;
  composite_score: number | null;
  admin_notes: string | null;
  summary_pros: string | null;
  summary_cons: string | null;
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
  { key: "noise", label: "Quietness" },
  { key: "value", label: "Value for Money" },
  { key: "location", label: "Location" },
  { key: "condition", label: "Building Condition" },
];

const REVIEW_CATEGORIES = [
  { key: "management", label: "Management" },
  { key: "quietness", label: "Quietness" },
  { key: "value_for_money", label: "Value for Money" },
  { key: "location", label: "Location" },
  { key: "building_condition", label: "Building Condition" },
] as const;

type ReviewCategoryKey = typeof REVIEW_CATEGORIES[number]["key"];

type Review = {
  id: string;
  user_id: string;
  overall: number;
  management: number;
  quietness: number;
  value_for_money: number;
  location: number;
  building_condition: number;
  comment: string;
  tenancy_period: string | null;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

const ScoreBar = ({ label, score }: { label: string; score: number | null }) => {
  const pct = score != null ? Math.max(0, Math.min(1, score / 5)) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-ink font-medium">{label}</span>
        <span className="text-ink-muted tabular-nums">
          {score != null ? `${Number(score).toFixed(1)} / 5` : "—"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-hairline overflow-hidden">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const blankReview = {
  overall: 0,
  management: 0,
  quietness: 0,
  value_for_money: 0,
  location: 0,
  building_condition: 0,
  comment: "",
  tenancy_period: "",
};

const BuildingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blankReview);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleData);
      }
    });
  }, []);

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

  const loadReviews = async (buildingId: string) => {
    const { data } = await supabase
      .from("building_reviews")
      .select("*, profiles:profiles!building_reviews_user_id_fkey(display_name)")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    // FK join may not exist; fallback to manual join
    let rows = (data ?? []) as any[];
    if (!data || (rows[0] && rows[0].profiles === undefined)) {
      const { data: raw } = await supabase
        .from("building_reviews")
        .select("*")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false });
      rows = raw ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", ids);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name]));
        rows = rows.map((r) => ({ ...r, profiles: { display_name: map.get(r.user_id) ?? null } }));
      }
    }
    setReviews(rows as Review[]);
    const mine = userId ? rows.find((r: any) => r.user_id === userId) ?? null : null;
    setMyReview(mine);
    if (mine) {
      setForm({
        overall: mine.overall,
        management: mine.management,
        quietness: mine.quietness,
        value_for_money: mine.value_for_money,
        location: mine.location,
        building_condition: mine.building_condition,
        comment: mine.comment,
        tenancy_period: mine.tenancy_period ?? "",
      });
    }
  };

  useEffect(() => {
    if (building?.id) loadReviews(building.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id, userId]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !building) return;
    if (form.overall < 1) {
      toast.error("Please select an overall star rating");
      return;
    }
    if (form.comment.trim().length < 20) {
      toast.error("Comment must be at least 20 characters");
      return;
    }
    setSubmitting(true);
    const payload = {
      building_id: building.id,
      user_id: userId,
      overall: form.overall,
      management: form.management,
      quietness: form.quietness,
      value_for_money: form.value_for_money,
      location: form.location,
      building_condition: form.building_condition,
      comment: form.comment.trim(),
      tenancy_period: form.tenancy_period.trim() || null,
    };
    const { error } = myReview
      ? await supabase.from("building_reviews").update(payload).eq("id", myReview.id)
      : await supabase.from("building_reviews").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(myReview ? "Review updated" : "Review submitted");
    setEditing(false);
    loadReviews(building.id);
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("building_reviews").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Review deleted");
    if (building) loadReviews(building.id);
  };

  if (loading) return <Spinner className="min-h-screen" />;

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

  const avgOverall =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.overall, 0) / reviews.length
      : null;

  const showForm = userId && (!myReview || editing);

  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-[240px] w-full overflow-hidden bg-muted">
        {building.photo_url ? (
          <img src={building.photo_url} alt={building.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        <Link
          to="/"
          className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-medium text-ink shadow hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        <div className="absolute bottom-5 left-6 right-6 text-white">
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight drop-shadow-lg leading-tight">{building.name}</h1>
          {(building.address || building.neighborhood) && (
            <p className="mt-1 text-[14px] text-white/90 drop-shadow">
              {building.address}
              {building.neighborhood ? ` · ${building.neighborhood}` : ""}
            </p>
          )}
        </div>
      </section>

      <section className="container max-w-6xl py-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[12px] border border-hairline bg-card p-5 shadow-sm">
            <h2 className="text-[18px] font-semibold text-ink mb-4">Rating</h2>
            <div className="mb-5 flex items-center gap-3">
              <span className="text-5xl font-bold tabular-nums text-ink">
                {building.composite_score != null ? Number(building.composite_score).toFixed(1) : "—"}
              </span>
              <div className="flex flex-col">
                <StarsDisplay value={building.composite_score ?? 0} size={20} />
                <span className="text-[12px] text-ink-muted mt-1">out of 5</span>
              </div>
            </div>
            <div className="space-y-3">
              {CATEGORIES.map((c) => (
                <ScoreBar key={c.key} label={c.label} score={scores ? (scores[c.key] as number | null) : null} />
              ))}
            </div>
          </div>

          <div className="rounded-[12px] border border-hairline bg-card p-5 shadow-sm">
            <h2 className="text-[18px] font-semibold text-ink mb-4">Summary</h2>
            {building.admin_notes ? (
              <div
                className="text-[14px] leading-relaxed text-ink/90 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-1.5 [&_ul_li]:pl-6 [&_ul_li]:relative [&_ul_li]:before:content-['✅'] [&_ul_li]:before:absolute [&_ul_li]:before:left-0 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_em]:italic [&_em]:text-ink-muted [&_em]:text-[12px]"
                dangerouslySetInnerHTML={{ __html: building.admin_notes }}
              />
            ) : (
              <p className="text-[14px] text-ink-muted">No notes yet.</p>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-6 rounded-[12px] border border-hairline bg-card p-5 shadow-sm space-y-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-[18px] font-semibold text-ink">Reviews</h2>
            {avgOverall != null && (
              <div className="flex items-center gap-2 text-[13px]">
                <StarsDisplay value={avgOverall} size={16} />
                <span className="font-semibold tabular-nums text-ink">{avgOverall.toFixed(1)}</span>
                <span className="text-ink-muted">({reviews.length})</span>
              </div>
            )}
          </div>

          {/* Form / login prompt */}
          {!userId ? (
            <p className="text-[14px] text-ink-muted">
              <Link to="/auth" className="underline">Log in</Link> to write a review.
            </p>
          ) : showForm ? (
            <form onSubmit={submitReview} className="space-y-4 rounded-[12px] border border-hairline p-5">
              <div>
                <Label className="mb-1.5 block text-[13px] text-ink">Overall rating</Label>
                <StarsInput value={form.overall} onChange={(v) => setForm({ ...form, overall: v })} size={24} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {REVIEW_CATEGORIES.map((c, i) => {
                  // building_condition full width as last item
                  const isFull = c.key === "building_condition";
                  return (
                    <div key={c.key} className={isFull ? "sm:col-span-2" : ""}>
                      <Label className="mb-1 block text-[13px] text-ink">{c.label}</Label>
                      <StarsInput
                        value={form[c.key as ReviewCategoryKey]}
                        onChange={(v) => setForm({ ...form, [c.key]: v })}
                        size={20}
                      />
                    </div>
                  );
                })}
              </div>
              <div>
                <Label htmlFor="comment" className="text-[13px] text-ink">Comment (min 20 characters)</Label>
                <Textarea
                  id="comment"
                  rows={4}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tenancy" className="text-[13px] text-ink">Tenancy period (optional)</Label>
                <Input
                  id="tenancy"
                  placeholder="e.g. 2022-2024"
                  value={form.tenancy_period}
                  onChange={(e) => setForm({ ...form, tenancy_period: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-[12px] bg-brand text-white text-[14px] font-semibold py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-60"
                >
                  {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
                </button>
                {myReview && (
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : myReview ? (
            <div className="rounded-[12px] border border-hairline p-4 space-y-2">
              <p className="text-[13px] text-ink-muted">Your review is shown below.</p>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit my review</Button>
            </div>
          ) : null}

          {/* Review list */}
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-[14px] text-ink-muted">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-[12px] border border-hairline p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[14px] text-ink">{r.profiles?.display_name ?? "Anonymous"}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <StarsDisplay value={r.overall} size={14} />
                        <span className="text-[13px] font-medium tabular-nums text-ink">{r.overall.toFixed(1)}</span>
                        <span className="text-[12px] text-ink-muted">
                          {new Date(r.created_at).toLocaleDateString()}
                          {r.tenancy_period ? ` · ${r.tenancy_period}` : ""}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteReview(r.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <p className="text-[14px] text-ink/90 whitespace-pre-wrap">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuildingDetail;
