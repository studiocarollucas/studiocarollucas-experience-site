"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/auth/safe-redirect";

export async function signInWithPassword(formData: FormData) {
  const target = safeRedirect(formData.get("redirect"), "/admin");
  const redirectQuery = `&redirect=${encodeURIComponent(target)}`;

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect(`/admin/login?error=${encodeURIComponent("Informe e-mail e senha.")}${redirectQuery}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}${redirectQuery}`);
  }

  redirect(target);
}
