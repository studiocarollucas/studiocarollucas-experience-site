import { MyShoot } from "@/components/client/my-shoot";
import { getPortalShootSnapshot } from "@/domain/portal/server";

export default async function MyShootPage() {
  const snapshot = await getPortalShootSnapshot();
  return (
    <MyShoot
      snapshot={snapshot}
      contactUrl={process.env.NEXT_PUBLIC_STUDIO_WHATSAPP_URL}
    />
  );
}
