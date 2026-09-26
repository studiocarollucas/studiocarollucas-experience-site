import { JourneyHome } from "@/components/client/journey-home";
import { ReviewPrompt } from "@/components/client/review-prompt";
import { getPortalHomeData } from "@/domain/portal/server";
import { getPortalReviewPrompt } from "@/domain/reviews/portal-server";

export default async function ClientHome() {
  const [{ snapshot, today }, reviewPrompt] = await Promise.all([getPortalHomeData(), getPortalReviewPrompt()]);

  return (
    <>
      <JourneyHome snapshot={snapshot} today={today} />
      {reviewPrompt ? <ReviewPrompt reviewUrl={reviewPrompt.reviewUrl} /> : null}
    </>
  );
}
