export type PublicQuizEventName = "quiz_lead_created" | "quiz_whatsapp_clicked";

type PublicQuizEvent = { name: PublicQuizEventName; source: "quiz" };
type PublicEventParameters = Omit<PublicQuizEvent, "name">;

type Gtag = {
  (command: "js", date: Date): void;
  (command: "config", measurementId: string): void;
  (command: "event", eventName: PublicQuizEventName, parameters: PublicEventParameters): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
  }
}

export function trackPublicEvent(event: PublicQuizEvent) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", event.name, { source: event.source });
}
