export type PublicEventName =
  | "quiz_lead_created"
  | "quiz_whatsapp_clicked"
  | "paixao_clutch_home_clicked"
  | "paixao_clutch_whatsapp_clicked";

type PublicEvent =
  | { name: "quiz_lead_created" | "quiz_whatsapp_clicked"; source: "quiz" }
  | { name: "paixao_clutch_home_clicked"; source: "home" }
  | { name: "paixao_clutch_whatsapp_clicked"; source: "paixao_clutch" };
type PublicEventParameters = Omit<PublicEvent, "name">;

type Gtag = {
  (command: "js", date: Date): void;
  (command: "config", measurementId: string): void;
  (command: "event", eventName: PublicEventName, parameters: PublicEventParameters): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
  }
}

export function trackPublicEvent(event: PublicEvent) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", event.name, { source: event.source });
}
