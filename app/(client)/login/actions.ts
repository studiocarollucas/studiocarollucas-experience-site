"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/auth/safe-redirect";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendMagicLink(formData: FormData) {
  const safeTarget = safeRedirect(formData.get("redirect"), "/minha-experiencia");
  const redirectQuery = `&redirect=${encodeURIComponent(safeTarget)}`;

  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    redirect(`/login?error=${encodeURIComponent("Informe um e-mail válido.")}${redirectQuery}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // PKCE (the @supabase/ssr default) sends a ?code=... back to this URL;
      // app/auth/callback/route.ts exchanges it for a session.
      emailRedirectTo: `${SITE_URL}/auth/callback?redirect=${encodeURIComponent(safeTarget)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}${redirectQuery}`);
  }

  redirect(`/login?sent=1${redirectQuery}`);
}
