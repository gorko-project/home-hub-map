# Debug: log auth.getUser() id for the signed-in user

## Goal

Confirm what `supabase.auth.getUser()` returns as `user.id` when `grkmtpc+1@gmail.com` is signed in, so we can verify it matches the `user_id` we expect in `user_roles` (`99b6602a-fe26-4941-84b4-ff3a429367ea`).

## Changes

**`src/components/Navbar.tsx`** — inside the existing auth effect, after resolving the session, add a temporary debug block:

```ts
const { data: userData } = await supabase.auth.getUser();
console.log("[auth-debug] getUser().id =", userData.user?.id, "email =", userData.user?.email);

const { data: roleData, error: roleError } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", uid)
  .eq("role", "admin")
  .maybeSingle();

console.log("[auth-debug] user_roles lookup", { uid, roleData, roleError, isAdmin: !!roleData });
```

This logs:
1. The actual `user.id` returned from `auth.getUser()` (authoritative — comes from the JWT).
2. The result of the `user_roles` query so we can see whether RLS is blocking the read or the row simply isn't there.

## Then

Once the user reports the logged values back, decide:
- If `getUser().id` ≠ `99b6602a-...` → the +1 account in the new project has a different id; insert an admin row for the actual id.
- If id matches but `roleData` is null with no error → row missing; insert it.
- If `roleError` is set → RLS issue on `user_roles`.

## Out of scope

No changes to admin check logic or RLS yet — this step is purely diagnostic.
