import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAnalytics } from "@/components/site/google-analytics";

vi.mock("next/script", () => ({
  default: ({ onLoad, src }: { onLoad?: () => void; src: string }) => (
    <button type="button" data-testid="ga-script" data-src={src} onClick={onLoad} />
  ),
}));

describe("GoogleAnalytics", () => {
  afterEach(() => {
    delete window.gtag;
    delete window.dataLayer;
  });

  it("does not render GA scripts without a measurement id", () => {
    expect(render(<GoogleAnalytics measurementId={undefined} />).container.innerHTML).toBe("");
  });

  it("loads the configured GA script and initializes it after loading", () => {
    render(<GoogleAnalytics measurementId="G-TEST123" />);

    expect(screen.getByTestId("ga-script")).toHaveAttribute(
      "data-src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );

    fireEvent.click(screen.getByTestId("ga-script"));

    expect(window.dataLayer).toEqual([
      ["js", expect.any(Date)],
      ["config", "G-TEST123"],
    ]);
  });
});
