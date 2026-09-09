"use client";

import Script from "next/script";

function initializeGoogleAnalytics(measurementId: string) {
  window.dataLayer ??= [];
  window.gtag ??= (...arguments_: unknown[]) => {
    window.dataLayer?.push(arguments_);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  if (!measurementId) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      onLoad={() => initializeGoogleAnalytics(measurementId)}
    />
  );
}
