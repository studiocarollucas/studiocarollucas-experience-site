import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { studioDate } from "./countdown";
import {
  readPortalChecklistSnapshot,
  readPortalContext,
  readPortalHomeSnapshot,
  readPortalShootSnapshot,
  readPortalStylingSnapshot,
} from "./read";

const getPortalRequest = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const context = await readPortalContext(supabase, now);
  return { context, now, supabase };
});

export async function getPortalRequestContext() {
  return (await getPortalRequest()).context;
}

export async function getPortalHomeData() {
  const request = await getPortalRequest();
  return {
    snapshot: await readPortalHomeSnapshot(
      request.supabase,
      request.now,
      request.context,
    ),
    today: studioDate(request.now),
  };
}

export async function getPortalChecklistSnapshot() {
  const request = await getPortalRequest();
  return readPortalChecklistSnapshot(request.supabase, request.now, request.context);
}

export async function getPortalShootSnapshot() {
  const request = await getPortalRequest();
  return readPortalShootSnapshot(request.supabase, request.now, request.context);
}

export async function getPortalStylingSnapshot() {
  const request = await getPortalRequest();
  return readPortalStylingSnapshot(request.supabase, request.now, request.context);
}
