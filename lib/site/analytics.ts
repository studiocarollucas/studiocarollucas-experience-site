export type PublicQuizEventName = "quiz_lead_created" | "quiz_whatsapp_clicked";

export function trackPublicEvent(event: { name: PublicQuizEventName; source: "quiz" }) {
  if (typeof window === "undefined") return;

  void event;
}
