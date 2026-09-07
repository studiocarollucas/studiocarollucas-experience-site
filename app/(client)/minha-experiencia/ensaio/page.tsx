import { MyShoot } from "@/components/client/my-shoot";
import { readPortalSnapshot } from "@/domain/portal/read";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyShootPage() {
  const snapshot = await readPortalSnapshot(await createSupabaseServerClient());
  return (
    <MyShoot
      snapshot={snapshot}
      contactUrl={process.env.NEXT_PUBLIC_STUDIO_WHATSAPP_URL}
    />
  );
}
