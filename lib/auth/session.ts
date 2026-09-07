import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export type Role = "admin" | "staff" | "client";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function resolveRole(profile: { role: Role } | null): Role {
  return profile?.role ?? "client";
}

export async function getCurrentUser(
  suppliedClient?: ServerSupabaseClient
): Promise<CurrentUser | null> {
  const supabase = suppliedClient ?? (await createSupabaseServerClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return {
    id: user.id,
    email: user.email,
    role: resolveRole(profile ?? null),
  };
}
