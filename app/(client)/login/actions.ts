"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Informe um e-mail válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
