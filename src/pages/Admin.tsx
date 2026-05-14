import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { StarsDisplay } from "@/components/Stars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { Spinner } from "@/components/Spinner";
import { Check, Star, Trash2 } from "lucide-react";
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

type BuildingRow = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  admin_notes: string | null;
  summary_pros: string | null;
  summary_cons: string | null;
  photo_url: string | null;
  composite_score: number | null;
  walk_score: number | null;
  transit_score: number | null;
  bike_score: number | null;
  building_amenities: string | null;
  unit_features: string | null;
  dogs_allowed: boolean | null;
  cats_allowed: boolean | null;
};

type ScoresState = {
  management: string;
  noise: string;
  value: string;
  location: string;
  condition: string;
  composite: string;
};

type PhotoRow = {
  id: string;
  url: string;
  is_primary: boolean;
  display_order: number;
};

const blankForm = {
  name: "",
  address: "",
  neighborhood: "",
  slug: "",
  latitude: "",
  longitude: "",
  admin_notes: "",
  summary_pros: "",
  summary_cons: "",
  photo_url: "",
  status: "draft" as "draft" | "published",
  walk_score: "",
  transit_score: "",
  bike_score: "",
  building_amenities: "",
  unit_features: "",
  dogs_allowed: "unspecified" as "allowed" | "not_allowed" | "unspecified",
  cats_allowed: "unspecified" as "allowed" | "not_allowed" | "unspecified",
};

const blankScores: ScoresState = {
  management: "",
  noise: "",
  value: "",
  location: "",
  condition: "",
  composite: "",
};

const normalizeScoreInput = (value: string) => value.replace(/,/g, ".");

const parseScore = (value: string) => {
  const normalized = normalizeScoreInput(value).trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null;
  return Math.round(parsed * 10) / 10;
};

const parseIntScore = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
};

type ScoreInputProps = {
  label: string;
  field: keyof ScoresState;
  scores: ScoresState;
  setScores: React.Dispatch<React.SetStateAction<ScoresState>>;
};

const ScoreInput = ({ label, field, scores, setScores }: ScoreInputProps) => {
  const val = scores[field];
  const num = parseFloat(val);
  const display = Number.isFinite(num) ? num : 0;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="e.g. 4.4"
          autoComplete="off"
          enterKeyHint="done"
          value={val}
          onChange={(e) => {
            const nextValue = normalizeScoreInput(e.target.value);
            if (/^$|^\d{0,2}(?:\.\d?)?$/.test(nextValue)) {
              setScores((s) => ({ ...s, [field]: nextValue }));
            }
          }}
          onBlur={(e) => {
            const parsed = parseScore(e.target.value);
            setScores((s) => ({
              ...s,
              [field]: parsed == null ? normalizeScoreInput(e.target.value).trim() : parsed.toFixed(1),
            }));
          }}
          className="w-24 no-spinner"
        />
        <StarsDisplay value={display} size={18} />
        <span className="text-sm text-muted-foreground tabular-nums">
          {Number.isFinite(num) ? num.toFixed(1) : "—"} / 5
        </span>
      </div>
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState(blankForm);
  const [scores, setScores] = useState<ScoresState>(blankScores);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);

  // Auth + role check
  useEffect(() => {
    const check = async (session: { user: { id: string } } | null) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) console.error(error);
      setIsAdmin(!!data);
      setAuthChecked(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session as any);
    });
    supabase.auth.getSession().then(({ data }) => check(data.session as any));
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const loadBuildings = async () => {
    const { data, error } = await supabase
      .from("buildings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setBuildings((data ?? []) as BuildingRow[]);
  };

  useEffect(() => {
    if (isAdmin) loadBuildings();
  }, [isAdmin]);

  useEffect(() => {
    if (authChecked && !isAdmin) navigate("/");
  }, [authChecked, isAdmin, navigate]);

  // Auto-generate slug from name unless user edited it
  useEffect(() => {
    if (!slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  const loadPhotos = async (buildingId: string) => {
    const { data } = await supabase
      .from("building_photos")
      .select("id,url,is_primary,display_order")
      .eq("building_id", buildingId)
      .order("display_order", { ascending: true });
    setPhotos((data ?? []) as PhotoRow[]);
  };

  const handleMultiPhotoUpload = async (files: FileList) => {
    if (!editingId) {
      toast.error("Save the building first to upload photos.");
      return;
    }
    if (photos.length + files.length > 10) {
      toast.error("Maximum 10 photos per building.");
      return;
    }
    setUploading(true);
    try {
      const baseOrder = photos.length;
      let i = 0;
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${editingId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("building-photos").upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("building-photos").getPublicUrl(path);
        const isFirst = photos.length === 0 && i === 0;
        const { error: insErr } = await supabase.from("building_photos").insert({
          building_id: editingId,
          url: data.publicUrl,
          is_primary: isFirst,
          display_order: baseOrder + i,
        });
        if (insErr) throw insErr;
        i++;
      }
      await loadPhotos(editingId);
      toast.success("Photos uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setMainPhoto = async (id: string) => {
    if (!editingId) return;
    await supabase.from("building_photos").update({ is_primary: false }).eq("building_id", editingId);
    const { error } = await supabase.from("building_photos").update({ is_primary: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadPhotos(editingId);
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from("building_photos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (editingId) await loadPhotos(editingId);
  };

  const resetForm = () => {
    setForm(blankForm);
    setScores(blankScores);
    setEditingId(null);
    setEditingScoreId(null);
    setSlugTouched(false);
    setPhotos([]);
  };

  const startEdit = async (b: BuildingRow) => {
    setEditingId(b.id);
    setSlugTouched(true);
    setForm({
      name: b.name ?? "",
      address: b.address ?? "",
      neighborhood: b.neighborhood ?? "",
      slug: b.slug ?? "",
      latitude: b.latitude != null ? String(b.latitude) : "",
      longitude: b.longitude != null ? String(b.longitude) : "",
      admin_notes: b.admin_notes ?? "",
      summary_pros: b.summary_pros ?? "",
      summary_cons: b.summary_cons ?? "",
      photo_url: b.photo_url ?? "",
      status: (b.status as "draft" | "published") ?? "draft",
      walk_score: b.walk_score != null ? String(b.walk_score) : "",
      transit_score: b.transit_score != null ? String(b.transit_score) : "",
      bike_score: b.bike_score != null ? String(b.bike_score) : "",
      building_amenities: b.building_amenities ?? "",
      unit_features: b.unit_features ?? "",
      dogs_allowed: b.dogs_allowed === true ? "allowed" : b.dogs_allowed === false ? "not_allowed" : "unspecified",
      cats_allowed: b.cats_allowed === true ? "allowed" : b.cats_allowed === false ? "not_allowed" : "unspecified",
    });
    const { data } = await supabase
      .from("building_scores")
      .select("*")
      .eq("building_id", b.id)
      .maybeSingle();
    if (data) {
      setEditingScoreId(data.id);
      setScores({
        management: data.management != null ? String(data.management) : "",
        noise: data.noise != null ? String(data.noise) : "",
        value: data.value != null ? String(data.value) : "",
        location: data.location != null ? String(data.location) : "",
        condition: data.condition != null ? String(data.condition) : "",
        composite: b.composite_score != null ? String(b.composite_score) : "",
      });
    } else {
      setEditingScoreId(null);
      setScores({ ...blankScores, composite: b.composite_score != null ? String(b.composite_score) : "" });
    }
    await loadPhotos(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("building_scores").delete().eq("building_id", id);
    await supabase.from("building_photos").delete().eq("building_id", id);
    const { error } = await supabase.from("buildings").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    loadBuildings();
    if (editingId === id) resetForm();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error("Name and slug required");
      return;
    }
    setSaving(true);
    try {
      const compositeNum = parseScore(scores.composite);
      const payload = {
        name: form.name,
        slug: form.slug,
        address: form.address || null,
        neighborhood: form.neighborhood || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        admin_notes: form.admin_notes || null,
        summary_pros: form.summary_pros || null,
        summary_cons: form.summary_cons || null,
        photo_url: form.photo_url || null,
        status: form.status,
        composite_score: compositeNum,
        walk_score: parseIntScore(form.walk_score),
        transit_score: parseIntScore(form.transit_score),
        bike_score: parseIntScore(form.bike_score),
        building_amenities: form.building_amenities || null,
        unit_features: form.unit_features || null,
        dogs_allowed: form.dogs_allowed === "allowed" ? true : form.dogs_allowed === "not_allowed" ? false : null,
        cats_allowed: form.cats_allowed === "allowed" ? true : form.cats_allowed === "not_allowed" ? false : null,
      };

      let buildingId = editingId;
      if (editingId) {
        const { error } = await supabase.from("buildings").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("buildings")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        buildingId = data.id;
      }

      if (!buildingId) throw new Error("Missing building id");

      const scorePayload = {
        building_id: buildingId,
        management: parseScore(scores.management),
        noise: parseScore(scores.noise),
        value: parseScore(scores.value),
        location: parseScore(scores.location),
        condition: parseScore(scores.condition),
      };
      if (editingScoreId) {
        const { error } = await supabase
          .from("building_scores")
          .update(scorePayload)
          .eq("id", editingScoreId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("building_scores").insert(scorePayload);
        if (error) throw error;
      }

      toast.success("Building saved!");
      const wasNew = !editingId;
      if (wasNew) {
        resetForm();
      }
      loadBuildings();
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Spinner />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin</h1>
          <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}>
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit building" : "Add new building"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="name">Building name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Neighborhood</Label>
                <Input id="neighborhood" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Admin notes (internal)</Label>
                <RichTextEditor
                  value={form.admin_notes}
                  onChange={(html) => setForm({ ...form, admin_notes: html })}
                  placeholder="Internal notes (not shown publicly)…"
                />
              </div>

              {/* Summary section */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="text-base font-semibold mb-3">Summary (Pros & Cons)</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="pros" className="flex items-center gap-1.5">
                      <span className="text-green-600">✅</span> Summary — Pros
                    </Label>
                    <Textarea
                      id="pros"
                      rows={5}
                      placeholder="Write one item per line"
                      value={form.summary_pros}
                      onChange={(e) => setForm({ ...form, summary_pros: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cons" className="flex items-center gap-1.5">
                      <span className="text-red-600">❌</span> Summary — Cons
                    </Label>
                    <Textarea
                      id="cons"
                      rows={5}
                      placeholder="Write one item per line"
                      value={form.summary_cons}
                      onChange={(e) => setForm({ ...form, summary_cons: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "draft" | "published") => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 grid gap-4 md:grid-cols-2 pt-4 border-t">
                <ScoreInput label="Management (30%)" field="management" scores={scores} setScores={setScores} />
                <ScoreInput label="Quietness (20%)" field="noise" scores={scores} setScores={setScores} />
                <ScoreInput label="Value for Money (20%)" field="value" scores={scores} setScores={setScores} />
                <ScoreInput label="Location (15%)" field="location" scores={scores} setScores={setScores} />
                <ScoreInput label="Building Condition (15%)" field="condition" scores={scores} setScores={setScores} />
              </div>

              <div className="md:col-span-2 pt-4 border-t">
                <ScoreInput label="Composite score" field="composite" scores={scores} setScores={setScores} />
              </div>

              {/* Walk, Transit & Bike */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="text-base font-semibold mb-3">Walk, Transit &amp; Bike Scores</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="walk">Walk Score (0–100)</Label>
                    <Input id="walk" type="number" min={0} max={100} value={form.walk_score}
                      onChange={(e) => setForm({ ...form, walk_score: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="transit">Transit Score (0–100)</Label>
                    <Input id="transit" type="number" min={0} max={100} value={form.transit_score}
                      onChange={(e) => setForm({ ...form, transit_score: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="bike">Bike Score (0–100)</Label>
                    <Input id="bike" type="number" min={0} max={100} value={form.bike_score}
                      onChange={(e) => setForm({ ...form, bike_score: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Facts, features & policies */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="text-base font-semibold mb-3">Facts, features &amp; policies</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="amenities">Building amenities</Label>
                    <Textarea
                      id="amenities"
                      rows={5}
                      placeholder="One item per line (e.g. Pool, Gym, Doorman)"
                      value={form.building_amenities}
                      onChange={(e) => setForm({ ...form, building_amenities: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitfeats">Unit features</Label>
                    <Textarea
                      id="unitfeats"
                      rows={5}
                      placeholder="One item per line (e.g. In-unit laundry, Dishwasher)"
                      value={form.unit_features}
                      onChange={(e) => setForm({ ...form, unit_features: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Pet Policy */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="text-base font-semibold mb-3">Pet Policy</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Dogs</Label>
                    <Select
                      value={form.dogs_allowed}
                      onValueChange={(v: "allowed" | "not_allowed" | "unspecified") =>
                        setForm({ ...form, dogs_allowed: v })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">Allowed</SelectItem>
                        <SelectItem value="not_allowed">Not allowed</SelectItem>
                        <SelectItem value="unspecified">Not specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cats</Label>
                    <Select
                      value={form.cats_allowed}
                      onValueChange={(v: "allowed" | "not_allowed" | "unspecified") =>
                        setForm({ ...form, cats_allowed: v })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">Allowed</SelectItem>
                        <SelectItem value="not_allowed">Not allowed</SelectItem>
                        <SelectItem value="unspecified">Not specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="text-base font-semibold mb-3">Photos (up to 10)</h3>
                {!editingId ? (
                  <p className="text-sm text-muted-foreground">Save the building first to upload photos.</p>
                ) : (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && e.target.files.length > 0 && handleMultiPhotoUpload(e.target.files)}
                      disabled={uploading || photos.length >= 10}
                    />
                    {photos.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {photos.map((p) => (
                          <div key={p.id} className="relative group rounded-md overflow-hidden border">
                            <img src={p.url} alt="" className="w-full h-28 object-cover" />
                            {p.is_primary && (
                              <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-full bg-[#f97316] text-white text-[10px] font-semibold px-2 py-0.5">
                                <Check className="h-3 w-3" /> Main
                              </span>
                            )}
                            <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/40 opacity-0 group-hover:opacity-100 transition">
                              {!p.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => setMainPhoto(p.id)}
                                  className="text-[10px] bg-white/90 text-gray-900 px-2 py-0.5 rounded inline-flex items-center gap-1"
                                >
                                  <Star className="h-3 w-3" /> Set main
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deletePhoto(p.id)}
                                className="ml-auto text-[10px] bg-red-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving || uploading}>
                  {saving ? "Saving…" : editingId ? "Update building" : "Create building"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All buildings ({buildings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Neighborhood</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.neighborhood ?? "—"}</TableCell>
                    <TableCell>{b.composite_score != null ? `${Number(b.composite_score).toFixed(1)} ★` : "—"}</TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(b)}>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this building?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{b.name}" and its scores. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(b.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {buildings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No buildings yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
