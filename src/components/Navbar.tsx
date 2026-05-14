import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async (uid: string | null) => {
      setUserId(uid);
      if (!uid) {
        setIsAdmin(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      console.log("[auth-debug] getUser().id =", userData.user?.id, "email =", userData.user?.email);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      console.log("[auth-debug] user_roles lookup", { uid, data, error, isAdmin: !!data });
      setIsAdmin(!!data);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => check(data.session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="border-b border-border bg-background relative z-20">
      <nav className="container flex h-14 items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight">
          ApartmentMap
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {isAdmin && (
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
          {userId ? (
            <Button size="sm" variant="outline" onClick={logout}>
              Log out
            </Button>
          ) : (
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};
