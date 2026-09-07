import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortalReference } from "@/domain/portal/types";
import { STYLING_BUCKET } from "./schema";

const REFERENCE_COLUMNS =
  "id,shoot_id,storage_path,caption,origin,uploaded_by_auth_user_id,created_at";

function unavailable(cause?: unknown): never {
  throw new Error("styling references unavailable", { cause });
}

export async function readStylingReferences(
  supabase: SupabaseClient,
  shootId: string
): Promise<PortalReference[]> {
  const rows = await supabase
    .from("styling_references")
    .select(REFERENCE_COLUMNS)
    .eq("shoot_id", shootId)
    .order("created_at", { ascending: true });
  if (rows.error) unavailable(rows.error);

  const references = rows.data ?? [];
  const paths = references.map((row) => row.storage_path);
  if (paths.length === 0) return [];

  const signed = await supabase.storage.from(STYLING_BUCKET).createSignedUrls(paths, 3600);
  if (
    signed.error ||
    !signed.data ||
    signed.data.length !== paths.length ||
    signed.data.some((item) => !item.signedUrl)
  ) {
    unavailable(signed.error);
  }

  return references.map((row, index) => ({
    id: row.id,
    shootId: row.shoot_id,
    storagePath: row.storage_path,
    signedUrl: signed.data[index].signedUrl,
    caption: row.caption,
    origin: row.origin,
    uploadedByAuthUserId: row.uploaded_by_auth_user_id,
    createdAt: row.created_at,
  })) as PortalReference[];
}
