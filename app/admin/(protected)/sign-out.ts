"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defineAdminAction } from "@/lib/auth/admin-action";

// role: "client" — any authenticated user may end their own session. Still routed
// through defineAdminAction so the CI guard sees a compliant "use server" file and
// the sign-out path gets the same getCurrentUser plumbing as every other action.
const signOut = defineAdminAction({ role: "client" }, async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return null;
});

export async function signOutAction() {
  await signOut(undefined);
  redirect("/admin/login");
}
