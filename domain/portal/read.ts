import type { SupabaseClient } from "@supabase/supabase-js";
import { readStylingReferences } from "@/domain/styling/read";
import { studioDate } from "./countdown";
import { selectPortalShoot } from "./selection";
import type { PortalPayment, PortalReference, PortalShoot, PortalTask } from "./types";

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

export type PortalContext = {
  client: { id: string; name: string };
  viewerAuthUserId: string;
  shoot: PortalShoot | null;
};

export type PortalSnapshot = PortalContext & {
  experience: PortalExperience | null;
  tasks: PortalTask[];
  payments: PortalPayment[];
  references: PortalReference[];
};

export class PortalReadError extends Error {
  constructor(
    public readonly code: "unauthenticated" | "unlinked" | "query_failed",
    cause?: unknown
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
// fixed-point representation. numeric(10,2) has at most eight integer digits, a
// range where JS numbers retain cent-level resolution; conversion itself remains
// textual and never performs monetary arithmetic.
function portalDecimal(value: unknown, field: string): string {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    queryFailed(new TypeError(`Invalid decimal value for ${field}`));
  }

  const match = /^(-?)(\d{1,8})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) queryFailed(new TypeError(`Invalid decimal value for ${field}`));

  const whole = match[2].replace(/^0+(?=\d)/, "");
  const fraction = (match[3] ?? "").padEnd(2, "0");
  const negative = match[1] === "-" && (whole !== "0" || fraction !== "00");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export async function readPortalContext(
  supabase: SupabaseClient,
  now = new Date()
): Promise<PortalContext> {
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
      "id,client_id,experience_package_id,shoot_date,start_time,status,agreed_price,payment_status,portal_enabled,location_name,location_address,client_guidance"
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

  return {
    client: clientData,
    viewerAuthUserId: authData.user.id,
    shoot: selectPortalShoot(shoots, studioDate(now)),
  };
}

async function readExperience(supabase: SupabaseClient, shoot: PortalShoot) {
  const result = await supabase
    .from("experience_packages")
    .select(
      "id,name,included_photos,duration_minutes,scenes,make_included,outfits_limit,clutch_included"
    )
    .eq("id", shoot.experiencePackageId)
    .maybeSingle();
  if (result.error) queryFailed(result.error);
  if (!result.data) return null;
  return {
    id: result.data.id,
    name: result.data.name,
    includedPhotos: result.data.included_photos,
    durationMinutes: result.data.duration_minutes,
    scenes: result.data.scenes,
    makeIncluded: result.data.make_included,
    outfitsLimit: result.data.outfits_limit,
    clutchIncluded: result.data.clutch_included,
  } as PortalExperience;
}

async function readTasks(supabase: SupabaseClient, shoot: PortalShoot) {
  const result = await supabase
    .from("preparation_tasks")
    .select(
      "id,shoot_id,type,title,status,due_at,visible_to_client,client_actionable,completed_at,created_at"
    )
    .eq("shoot_id", shoot.id)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (result.error) queryFailed(result.error);
  return (result.data ?? []).map((row) => ({
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
}

async function readPayments(supabase: SupabaseClient, shoot: PortalShoot) {
  const result = await supabase
    .from("payments")
    .select("id,shoot_id,amount,paid_at,status")
    .eq("shoot_id", shoot.id)
    .eq("status", "confirmado")
    .order("paid_at", { ascending: true });
  if (result.error) queryFailed(result.error);
  return (result.data ?? []).map((row) => ({
    id: row.id,
    shootId: row.shoot_id,
    amount: portalDecimal(row.amount, "payments.amount"),
    paidAt: row.paid_at,
    status: "confirmado" as const,
  }));
}

type PortalSections = {
  experience?: boolean;
  tasks?: boolean;
  payments?: boolean;
  references?: boolean;
};

async function readPortalSections(
  supabase: SupabaseClient,
  now: Date,
  context: PortalContext | undefined,
  sections: PortalSections
): Promise<PortalSnapshot> {
  const resolvedContext = context ?? (await readPortalContext(supabase, now));
  if (!resolvedContext.shoot) {
    return {
      ...resolvedContext,
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    };
  }

  const shoot = resolvedContext.shoot;
  try {
    const [experience, tasks, payments, references] = await Promise.all([
      sections.experience ? readExperience(supabase, shoot) : null,
      sections.tasks ? readTasks(supabase, shoot) : [],
      sections.payments ? readPayments(supabase, shoot) : [],
      sections.references ? readStylingReferences(supabase, shoot.id) : [],
    ]);
    return { ...resolvedContext, experience, tasks, payments, references };
  } catch (error) {
    if (error instanceof PortalReadError) throw error;
    queryFailed(error);
  }
}

export function readPortalHomeSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
  context?: PortalContext
) {
  return readPortalSections(supabase, now, context, { experience: true, tasks: true });
}

export function readPortalChecklistSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
  context?: PortalContext
) {
  return readPortalSections(supabase, now, context, { tasks: true });
}

export function readPortalShootSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
  context?: PortalContext
) {
  return readPortalSections(supabase, now, context, {
    experience: true,
    tasks: true,
    payments: true,
  });
}

export function readPortalStylingSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
  context?: PortalContext
) {
  return readPortalSections(supabase, now, context, { references: true });
}

export function readPortalSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
  context?: PortalContext
) {
  return readPortalSections(supabase, now, context, {
    experience: true,
    tasks: true,
    payments: true,
    references: true,
  });
}
