import { NextResponse } from "next/server";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { linkAuthUserToClient } from "@/lib/auth/client-link";
import { logger } from "@/lib/observability/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function denyClientAccess(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  origin: string
) {
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?error=access`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destination = safeRedirect(searchParams.get("redirect"), "/minha-experiencia");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !data.user?.email) {
          logger.warn("client magic-link account could not be linked", {
            authUserId: data.user?.id,
            errorName: getUserError ? "get_user_failed" : "missing_user_or_email",
          });
          return denyClientAccess(supabase, origin);
        }

        try {
          await linkAuthUserToClient({ id: data.user.id, email: data.user.email });
          return NextResponse.redirect(`${origin}${destination}`);
        } catch (linkError) {
          logger.warn("client magic-link account could not be linked", {
            authUserId: data.user.id,
            errorName: linkError instanceof Error ? linkError.name : "unknown",
          });
          return denyClientAccess(supabase, origin);
        }
      } catch (getUserError) {
        logger.warn("client magic-link account could not be linked", {
          errorName: getUserError instanceof Error ? getUserError.name : "unknown",
        });
        return denyClientAccess(supabase, origin);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
