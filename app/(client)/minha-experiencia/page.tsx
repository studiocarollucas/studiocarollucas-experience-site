import { JourneyHome } from "@/components/client/journey-home";
import { studioDate } from "@/domain/portal/countdown";
import { readPortalSnapshot } from "@/domain/portal/read";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientHome() {
  const now = new Date();
  const supabase = await createSupabaseServerClient();
  const snapshot = await readPortalSnapshot(supabase, now);

  return <JourneyHome snapshot={snapshot} today={studioDate(now)} />;
}
