export type PublicEventName =
  | "quiz_started"
  | "quiz_completed"
  | "quiz_lead_created"
  | "quiz_whatsapp_clicked"
  | "experience_whatsapp_clicked"
  | "paixao_clutch_home_clicked"
  | "paixao_clutch_whatsapp_clicked";

export type ExperienceWhatsAppSource = "home" | "experiences" | "experience_detail";

type PublicEvent =
  | {
      name: "quiz_started" | "quiz_completed" | "quiz_lead_created" | "quiz_whatsapp_clicked";
      source: "quiz";
    }
  | {
      name: "experience_whatsapp_clicked";
      source: ExperienceWhatsAppSource;
      /** Public editorial experience slug (e.g. "familia"). Never PII. */
      experience?: string;
    }
  | { name: "paixao_clutch_home_clicked"; source: "home" }
  | { name: "paixao_clutch_whatsapp_clicked"; source: "paixao_clutch" };

type PublicEventParameters = {
  source: PublicEvent["source"];
  experience?: string;
};

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

  const parameters: PublicEventParameters = { source: event.source };
  if ("experience" in event && event.experience) parameters.experience = event.experience;

  window.gtag("event", event.name, parameters);
}
