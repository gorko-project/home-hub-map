import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  photo_url: string | null;
  composite_score: number | null;
};

type ScoresState = {
  management: string;
  noise: string;
  value: string;
  location: string;
  condition: string;
  composite: string;
};

const blankForm = {
  name: "",
  address: "",
  neighborhood: "",
  slug: "",
  latitude: "",
  longitude: "",
  admin_notes: "",
  photo_url: "",
  status: "draft" as "draft" | "published",
};

const blankScores: ScoresState = {
  management: "2.5",
  noise: "2.5",
  value: "2.5",
  location: "2.5",
  condition: "2.5",
  composite: "2.5",
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


  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("building-photos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("building-photos").getPublicUrl(path);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm(blankForm);
    setScores(blankScores);
    setEditingId(null);
    setEditingScoreId(null);
    setSlugTouched(false);
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
      photo_url: b.photo_url ?? "",
      status: (b.status as "draft" | "published") ?? "draft",
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
      setScores({ ...blankScores, composite: b.composite_score != null ? String(b.composite_score) : "2.5" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("building_scores").delete().eq("building_id", id);
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
      const parseScore = (s: string) => {
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : null;
      };
      const compositeNum = parseScore(scores.composite);
      const payload = {
        name: form.name,
        slug: form.slug,
        address: form.address || null,
        neighborhood: form.neighborhood || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        admin_notes: form.admin_notes || null,
        photo_url: form.photo_url || null,
        status: form.status,
        composite_score: compositeNum,
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
      resetForm();
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

  const ScoreInput = ({
    label,
    field,
  }: {
    label: string;
    field: keyof ScoresState;
  }) => {
    const val = scores[field];
    const num = parseFloat(val);
    const display = Number.isFinite(num) ? num : 0;
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            max={5}
            step={0.1}
            value={val}
            onChange={(e) =>
              setScores((s) => ({ ...s, [field]: e.target.value }))
            }
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
                <Label htmlFor="notes">Admin notes</Label>
                <Textarea id="notes" rows={3} value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                  disabled={uploading}
                />
                {form.photo_url && (
                  <img src={form.photo_url} alt="Preview" className="mt-2 h-24 rounded object-cover" />
                )}
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
                <ScoreInput label="Management (30%)" field="management" />
                <ScoreInput label="Quietness (20%)" field="noise" />
                <ScoreInput label="Value for Money (20%)" field="value" />
                <ScoreInput label="Location (15%)" field="location" />
                <ScoreInput label="Building Condition (15%)" field="condition" />
              </div>

              <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-muted p-4">
                <span className="text-sm">Composite score</span>
                <div className="flex items-center gap-3">
                  <StarsDisplay value={composite} size={22} />
                  <span className="text-2xl font-bold tabular-nums">{composite.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
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
