import { JourneyHome } from "@/components/client/journey-home";
import { getPortalHomeData } from "@/domain/portal/server";

export default async function ClientHome() {
  const { snapshot, today } = await getPortalHomeData();

  return <JourneyHome snapshot={snapshot} today={today} />;
}
