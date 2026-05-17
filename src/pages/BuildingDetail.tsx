import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, Camera, Footprints, BusFront, Bike, X, ChevronLeft, ChevronRight, Dog, Cat } from "lucide-react";
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
  walk_score: number | null;
  transit_score: number | null;
  bike_score: number | null;
  building_amenities: string | null;
  unit_features: string | null;
  dogs_allowed: boolean | null;
  cats_allowed: boolean | null;
  pet_notes: string | null;
};

type Scores = {
  management: number | null;
  noise: number | null;
  value: number | null;
  location: number | null;
  condition: number | null;
  management_rationale: string | null;
  noise_rationale: string | null;
  value_rationale: string | null;
  location_rationale: string | null;
  condition_rationale: string | null;
};

type Photo = { id: string; url: string; is_primary: boolean; display_order: number };

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

const splitLines = (s: string | null) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

const splitTags = (s: string | null) =>
  (s ?? "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

const CategoryRow = ({
  label,
  score,
  rationale,
}: {
  label: string;
  score: number | null;
  rationale?: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const hasTip = !!rationale?.trim();

  return (
    <div
      className="relative flex items-center justify-between py-1.5"
      onMouseEnter={() => hasTip && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => hasTip && setOpen((o) => !o)}
    >
      <span className="text-[13px] text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <StarsDisplay value={score ?? 0} size={14} />
        <span className="text-[13px] font-medium tabular-nums text-[#f97316] w-8 text-right">
          {score != null ? Number(score).toFixed(1) : "—"}
        </span>
      </div>
      {open && hasTip && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 max-w-[280px] rounded-md border bg-popover p-3 text-[12px] text-popover-foreground shadow-md">
          {rationale}
        </div>
      )}
    </div>
  );
};

const ScoreCircle = ({
  icon: Icon,
  label,
  score,
}: {
  icon: typeof Footprints;
  label: string;
  score: number | null;
}) => (
  <div className="flex items-center gap-3 py-1.5">
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: 44, height: 44, backgroundColor: "#f97316" }}
    >
      <Icon className="text-white" size={22} />
    </div>
    <div className="text-[13px]">
      <span className="font-semibold text-gray-900 dark:text-gray-100">{label}</span>{" "}
      <span className="text-gray-500 dark:text-gray-400 tabular-nums">
        {score != null ? `${score} / 100` : "— / 100"}
      </span>
    </div>
  </div>
);

const PetCard = ({
  icon: Icon,
  label,
  allowed,
}: {
  icon: typeof Dog;
  label: string;
  allowed: boolean;
}) => (
  <div
    className="flex items-center justify-between gap-2"
    style={{
      maxWidth: 140,
      width: "100%",
      border: "0.5px solid #d1d5db",
      borderRadius: 10,
      padding: "10px 14px",
    }}
  >
    <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200" style={{ fontSize: 13, fontWeight: 500 }}>
      <Icon size={16} />
      <span>{label}</span>
    </div>
    <span
      style={{
        backgroundColor: allowed ? "#dcfce7" : "#fee2e2",
        color: allowed ? "#16a34a" : "#dc2626",
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 8,
        fontWeight: 600,
      }}
    >
      {allowed ? "Allowed" : "Not allowed"}
    </span>
  </div>
);

const BuildingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blankReview);
  const [submitting, setSubmitting] = useState(false);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

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
        .select("id,name,slug,address,neighborhood,photo_url,composite_score,admin_notes,summary_pros,summary_cons,walk_score,transit_score,bike_score,building_amenities,unit_features,dogs_allowed,cats_allowed,pet_notes")
        .eq("slug", slug)
        .maybeSingle();
      setBuilding(b as Building | null);
      if (b) {
        const [{ data: s }, { data: ph }] = await Promise.all([
          supabase
            .from("building_scores")
            .select("management,noise,value,location,condition,management_rationale,noise_rationale,value_rationale,location_rationale,condition_rationale")
            .eq("building_id", b.id)
            .maybeSingle(),
          supabase
            .from("building_photos")
            .select("id,url,is_primary,display_order")
            .eq("building_id", b.id)
            .order("is_primary", { ascending: false })
            .order("display_order", { ascending: true }),
        ]);
        setScores(s);
        setPhotos((ph ?? []) as Photo[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  const loadReviews = async (buildingId: string) => {
    const { data: raw } = await supabase
      .from("building_reviews")
      .select("*")
      .eq("building_id", buildingId)
      .order("created_at", { ascending: false });
    let rows = (raw ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name]));
      rows = rows.map((r) => ({ ...r, profiles: { display_name: map.get(r.user_id) ?? null } }));
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
    if (form.overall < 1) return toast.error("Please select an overall star rating");
    setSubmitting(true);
    try {
      const payload = {
        building_id: building.id,
        user_id: userId,
        overall: form.overall,
        management: form.management || null,
        quietness: form.quietness || null,
        value_for_money: form.value_for_money || null,
        location: form.location || null,
        building_condition: form.building_condition || null,
        comment: (form.comment ?? '').trim() || null,
        tenancy_period: (form.tenancy_period ?? '').trim() || null,
      };
      console.log("[review-debug] submitting", { isUpdate: !!myReview, reviewId: myReview?.id, userId, payload });
      const { data, error } = myReview
        ? await supabase
            .from("building_reviews")
            .update(payload)
            .eq("id", myReview.id)
            .eq("user_id", userId)
            .select()
        : await supabase.from("building_reviews").insert(payload).select();
      console.log("[review-debug] result", { data, error });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (myReview && (!data || data.length === 0)) {
        toast.error("Review not updated — no matching row found (id/user mismatch or RLS).");
        return;
      }
      toast.success(myReview ? "Review updated" : "Review submitted");
      setEditing(false);
      await loadReviews(building.id);
    } catch (err: any) {
      console.error("[review-debug] exception", err);
      toast.error(err?.message ?? "Unexpected error updating review");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("building_reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
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

  // Photo list with fallbacks: prefer photos table, fallback to building.photo_url
  const allPhotos: Photo[] = photos.length > 0
    ? photos
    : building.photo_url
      ? [{ id: "legacy", url: building.photo_url, is_primary: true, display_order: 0 }]
      : [];
  const main = allPhotos[0];
  const sides = allPhotos.slice(1, 5);

  const pros = splitLines(building.summary_pros);
  const cons = splitLines(building.summary_cons);
  const amenities = splitTags(building.building_amenities);
  const unitFeatures = splitTags(building.unit_features);

  const showWalk =
    building.walk_score != null || building.transit_score != null || building.bike_score != null;

  const avgOverall =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.overall, 0) / reviews.length : null;
  const showForm = userId && (!myReview || editing);

  const PhotoSlot = ({ url, onClick, rounded }: { url?: string; onClick?: () => void; rounded?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full h-full bg-gray-200 dark:bg-gray-800 overflow-hidden ${rounded ?? ""} ${url ? "cursor-pointer" : "cursor-default"}`}
    >
      {url && <img src={url} alt="" className="block w-full h-full object-cover" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="container max-w-6xl flex items-center justify-between h-14">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#f97316] hover:opacity-80">
            <ArrowLeft className="h-4 w-4" /> Back to map
          </Link>
          <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">ApartmentMap</span>
        </div>
      </header>

      <main className="container max-w-6xl py-5 flex-1">
        {/* Photo Grid */}
        <div className="grid grid-cols-2 gap-[2px] h-[300px] max-h-[300px] overflow-hidden relative">
          <PhotoSlot url={main?.url} onClick={main ? () => { setGalleryIdx(0); setGalleryOpen(true); } : undefined} rounded="rounded-l-md" />
          <div className="grid grid-cols-2 grid-rows-2 gap-[2px] h-full overflow-hidden relative">
            {[0, 1, 2, 3].map((i) => {
              const ph = sides[i];
              const last = i === 3;
              const rounded =
                i === 1 ? "rounded-tr-md" : i === 3 ? "rounded-br-md" : "";
              return (
                <div key={i} className={`relative h-full overflow-hidden md:block ${i >= 2 ? "hidden md:block" : ""}`}>
                  <PhotoSlot
                    url={ph?.url}
                    onClick={ph ? () => { setGalleryIdx(i + 1); setGalleryOpen(true); } : undefined}
                    rounded={rounded}
                  />
                  {last && allPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setGalleryIdx(0); setGalleryOpen(true); }}
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 bg-white text-gray-900 text-[12px] font-semibold px-2.5 py-1.5 rounded-md shadow border border-gray-200"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      See all {allPhotos.length} photos
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Building info */}
        <div className="mt-5">
          <h1 className="text-[22px] font-medium text-gray-900 dark:text-gray-100">{building.name}</h1>
          <div className="mt-1 flex items-center flex-wrap gap-2">
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              {building.address}
              {building.neighborhood ? ` · ${building.neighborhood}` : ""}
            </span>
            {building.composite_score != null && (
              <span
                className="inline-flex items-center gap-1 rounded-full text-white text-[12px] font-semibold px-2.5 py-0.5"
                style={{ backgroundColor: "#f97316" }}
              >
                {Number(building.composite_score).toFixed(1)} ★
              </span>
            )}
          </div>
        </div>

        {/* Rating + Walk Transit Bike */}
        <section className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className={`grid gap-6 ${showWalk ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            <div className={showWalk ? "md:pr-6 md:border-r md:border-gray-100 md:dark:border-gray-800" : ""}>
              <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-4">Rating</h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
{CATEGORIES.map((c) => (
                  <CategoryRow
                    key={c.key}
                    label={c.label}
                    score={scores ? (scores[c.key] as number | null) : null}
                    rationale={scores ? (scores[`${c.key}_rationale` as keyof Scores] as string | null) : null}
                  />
                ))}
              </div>
            </div>

            {showWalk && (
              <div>
                <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-4">Walk, Transit &amp; Bike</h2>
                <div>
                  <ScoreCircle icon={Footprints} label="Walk Score" score={building.walk_score} />
                  <ScoreCircle icon={BusFront} label="Transit Score" score={building.transit_score} />
                  <ScoreCircle icon={Bike} label="Bike Score" score={building.bike_score} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* What Residents Say */}
        {(pros.length > 0 || cons.length > 0) && (
          <section className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">What Residents Say</h2>
            {pros.length > 0 && (
              <ul className="space-y-1.5">
                {pros.map((p, i) => (
                  <li key={`p-${i}`} className="text-[13px] text-gray-500 dark:text-gray-400 leading-[1.55] flex gap-2">
                    <span className="shrink-0">✅</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
            {pros.length > 0 && cons.length > 0 && (
              <div className="my-4 border-t border-gray-100 dark:border-gray-800" />
            )}
            {cons.length > 0 && (
              <ul className="space-y-1.5">
                {cons.map((c, i) => (
                  <li key={`c-${i}`} className="text-[13px] text-gray-500 dark:text-gray-400 leading-[1.55] flex gap-2">
                    <span className="shrink-0">❌</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Facts, features & policies */}
        {(amenities.length > 0 || unitFeatures.length > 0 || building.dogs_allowed != null || building.cats_allowed != null) && (
          <section className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-4">Facts, features &amp; policies</h2>
            {amenities.length > 0 && (
              <div>
                <div className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2">Building amenities</div>
                <div className="flex flex-wrap">
                  {amenities.map((a, i) => (
                    <span
                      key={i}
                      className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[12px] rounded-md m-[3px]"
                      style={{ padding: "5px 10px" }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {unitFeatures.length > 0 && (
              <div className="mt-4">
                <div className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2">Unit features</div>
                <div className="flex flex-wrap">
                  {unitFeatures.map((u, i) => (
                    <span
                      key={i}
                      className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[12px] rounded-md m-[3px]"
                      style={{ padding: "5px 10px" }}
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(building.dogs_allowed != null || building.cats_allowed != null) && (
              <>
                {(amenities.length > 0 || unitFeatures.length > 0) && (
                  <div className="my-4 border-t border-gray-100 dark:border-gray-800" />
                )}
                <div className={amenities.length === 0 && unitFeatures.length === 0 ? "" : "mt-4"}>
                  <div className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2">Pet policy</div>
                  <div className="flex flex-wrap gap-2">
                    {building.dogs_allowed != null && (
                      <PetCard icon={Dog} label="Dogs" allowed={building.dogs_allowed} />
                    )}
                    {building.cats_allowed != null && (
                      <PetCard icon={Cat} label="Cats" allowed={building.cats_allowed} />
                    )}
                  </div>
                  {building.pet_notes && (
                    <p className="mt-3 text-[13px] text-gray-500 dark:text-gray-400 leading-[1.55]">
                      {building.pet_notes}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* Reviews (preserved functionality) */}
        <section className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">Reviews</h2>
            {avgOverall != null && (
              <div className="flex items-center gap-2 text-[13px]">
                <StarsDisplay value={avgOverall} size={16} />
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{avgOverall.toFixed(1)}</span>
                <span className="text-gray-500 dark:text-gray-400">({reviews.length})</span>
              </div>
            )}
          </div>

          {!userId ? (
            <p className="text-[14px] text-gray-500 dark:text-gray-400">
              <Link to="/auth" className="underline">Log in</Link> to write a review.
            </p>
          ) : showForm ? (
            <form onSubmit={submitReview} className="space-y-4 rounded-md border border-gray-100 dark:border-gray-800 p-5">
              <div className="rounded-md p-4" style={{ background: "#fff7ed" }}>
                <Label className="mb-2 block text-[16px] font-bold text-gray-900">Overall rating</Label>
                <StarsInput value={form.overall} onChange={(v) => setForm({ ...form, overall: v })} size={28} />
              </div>
              <div className="grid gap-3 grid-cols-2">
                {REVIEW_CATEGORIES.filter((c) => c.key !== "building_condition").slice(0, 4).map((c) => (
                  <div key={c.key}>
                    <Label className="mb-1 block text-[14px]">{c.label}</Label>
                    <StarsInput
                      value={form[c.key as ReviewCategoryKey]}
                      onChange={(v) => setForm({ ...form, [c.key]: v })}
                      size={20}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <Label className="mb-1 block text-[14px]">Building Condition</Label>
                  <StarsInput
                    value={form.building_condition}
                    onChange={(v) => setForm({ ...form, building_condition: v })}
                    size={20}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="comment" className="text-[13px]">Comment</Label>
                <Textarea id="comment" rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="tenancy" className="text-[13px]">Tenancy period (optional)</Label>
                <Input id="tenancy" placeholder="e.g. 2022-2024" value={form.tenancy_period} onChange={(e) => setForm({ ...form, tenancy_period: e.target.value })} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || form.overall < 1}
                  className="flex-1 rounded-md text-white text-[14px] font-semibold py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
                  style={form.overall >= 1 ? { backgroundColor: "#f97316" } : undefined}
                >
                  {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
                </button>
                {myReview && (
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                )}
              </div>
            </form>
          ) : myReview ? (
            <div className="rounded-md border border-gray-100 dark:border-gray-800 p-4 space-y-2">
              <p className="text-[13px] text-gray-500 dark:text-gray-400">Your review is shown below.</p>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit my review</Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-[14px] text-gray-500 dark:text-gray-400">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-md border border-gray-100 dark:border-gray-800 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[14px] text-gray-900 dark:text-gray-100">{r.profiles?.display_name ?? "Anonymous"}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <StarsDisplay value={r.overall} size={14} />
                        <span className="text-[13px] font-medium tabular-nums text-gray-900 dark:text-gray-100">{r.overall.toFixed(1)}</span>
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
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
                  <p className="text-[14px] whitespace-pre-wrap text-gray-700 dark:text-gray-300">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-10">
        <p className="text-[11px] italic text-center text-gray-500 dark:text-gray-400 py-3 px-4">
          *Based on publicly available resident reviews from the past 12 months.
        </p>
      </footer>

      {/* Gallery modal */}
      {galleryOpen && allPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setGalleryOpen(false)}>
          <button
            onClick={(e) => { e.stopPropagation(); setGalleryOpen(false); }}
            className="absolute top-4 right-4 text-white/90 hover:text-white p-2"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setGalleryIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length); }}
            className="absolute left-4 text-white/90 hover:text-white p-2"
            aria-label="Previous"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <img
            src={allPhotos[galleryIdx]?.url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setGalleryIdx((i) => (i + 1) % allPhotos.length); }}
            className="absolute right-4 text-white/90 hover:text-white p-2"
            aria-label="Next"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-[12px]">
            {galleryIdx + 1} / {allPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingDetail;
