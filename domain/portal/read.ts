import type { SupabaseClient } from "@supabase/supabase-js";
import { studioDate } from "./countdown";
import { selectPortalShoot } from "./selection";
import type { PortalPayment, PortalShoot, PortalTask } from "./types";

export type PortalExperience = {
  id: string;
  name: string;
  includedPhotos: number;
  durationMinutes: number;
  scenes: string | null;
  makeIncluded: boolean;
  outfitsLimit: number | null;
  clutchIncluded: boolean;
};

export type PortalSnapshot = {
  client: { id: string; name: string };
  shoot: PortalShoot | null;
  experience: PortalExperience | null;
  tasks: PortalTask[];
  payments: PortalPayment[];
};

export class PortalReadError extends Error {
  constructor(
    public readonly code: "unauthenticated" | "unlinked" | "query_failed",
    cause?: unknown,
  ) {
    super("portal data unavailable", { cause });
    this.name = "PortalReadError";
  }
}

function queryFailed(cause: unknown): never {
  throw new PortalReadError("query_failed", cause);
}

// PostgREST JSON encodes numeric columns as numbers in this project's live API,
// while Drizzle returns decimal strings. Keep the portal domain on one canonical
// fixed-point representation. numeric(12,2) has at most ten integer digits, a
// range where JS numbers still retain cent-level resolution; conversion itself
// remains textual and never performs monetary arithmetic.
function portalDecimal(value: unknown, field: string): string {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    queryFailed(new TypeError(`Invalid decimal value for ${field}`));
  }

  const match = /^(-?)(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) queryFailed(new TypeError(`Invalid decimal value for ${field}`));

  const whole = match[2].replace(/^0+(?=\d)/, "");
  const fraction = (match[3] ?? "").padEnd(2, "0");
  const negative = match[1] === "-" && (whole !== "0" || fraction !== "00");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export async function readPortalSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<PortalSnapshot> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new PortalReadError("unauthenticated");

  // RLS links auth.uid() to the only client row this JWT may read. Deliberately do
  // not select auth_user_id: authenticated has no grant for that internal column.
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id,name")
    .maybeSingle();
  if (clientError) queryFailed(clientError);
  if (!clientData) throw new PortalReadError("unlinked");

  const { data: shootData, error: shootError } = await supabase
    .from("shoots")
    .select(
      "id,client_id,experience_package_id,shoot_date,start_time,status,agreed_price,payment_status,portal_enabled,location_name,location_address,client_guidance",
    )
    .eq("client_id", clientData.id);
  if (shootError) queryFailed(shootError);

  const shoots = (shootData ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    experiencePackageId: row.experience_package_id,
    shootDate: row.shoot_date,
    startTime: row.start_time,
    status: row.status,
    agreedPrice: portalDecimal(row.agreed_price, "shoots.agreed_price"),
    paymentStatus: row.payment_status,
    portalEnabled: row.portal_enabled,
    locationName: row.location_name,
    locationAddress: row.location_address,
    clientGuidance: row.client_guidance,
  })) as PortalShoot[];
  const shoot = selectPortalShoot(shoots, studioDate(now));
  if (!shoot) {
    return { client: clientData, shoot: null, experience: null, tasks: [], payments: [] };
  }

  const [experienceResult, tasksResult, paymentsResult] = await Promise.all([
    supabase
      .from("experience_packages")
      .select(
        "id,name,included_photos,duration_minutes,scenes,make_included,outfits_limit,clutch_included",
      )
      .eq("id", shoot.experiencePackageId)
      .maybeSingle(),
    supabase
      .from("preparation_tasks")
      .select(
        "id,shoot_id,type,title,status,due_at,visible_to_client,client_actionable,completed_at,created_at",
      )
      .eq("shoot_id", shoot.id)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("id,shoot_id,amount,paid_at,status")
      .eq("shoot_id", shoot.id)
      .eq("status", "confirmado")
      .order("paid_at", { ascending: true }),
  ]);
  if (experienceResult.error || tasksResult.error || paymentsResult.error) {
    queryFailed(experienceResult.error ?? tasksResult.error ?? paymentsResult.error);
  }

  const experience = experienceResult.data
    ? {
        id: experienceResult.data.id,
        name: experienceResult.data.name,
        includedPhotos: experienceResult.data.included_photos,
        durationMinutes: experienceResult.data.duration_minutes,
        scenes: experienceResult.data.scenes,
        makeIncluded: experienceResult.data.make_included,
        outfitsLimit: experienceResult.data.outfits_limit,
        clutchIncluded: experienceResult.data.clutch_included,
      }
    : null;
  const tasks = (tasksResult.data ?? []).map((row) => ({
    id: row.id,
    shootId: row.shoot_id,
    type: row.type,
    title: row.title,
    status: row.status,
    dueAt: row.due_at,
    visibleToClient: row.visible_to_client,
    clientActionable: row.client_actionable,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  })) as PortalTask[];
  const payments = (paymentsResult.data ?? []).map((row) => ({
    id: row.id,
    shootId: row.shoot_id,
    amount: portalDecimal(row.amount, "payments.amount"),
    paidAt: row.paid_at,
    status: "confirmado" as const,
  }));

  return { client: clientData, shoot, experience, tasks, payments };
}
