"use client";

import Script from "next/script";

function initializeGoogleAnalytics(measurementId: string) {
  window.dataLayer ??= [];
  // gtag.js only honours commands pushed as the `arguments` object. Pushing a
  // real array (e.g. from a rest parameter) is dropped without an error: the
  // script loads, no hit is ever sent, and GA4 reports "no data received".
  // This has to stay a `function`; arrow functions have no `arguments`.
  window.gtag ??= function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
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
