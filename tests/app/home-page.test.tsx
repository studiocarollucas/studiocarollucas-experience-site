import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  trackPublicEvent: vi.fn(),
}));

vi.mock("@/domain/inventory/public-clutch", () => ({
  listPublicPaixaoClutches: mocks.list,
}));
vi.mock("@/lib/site/analytics", () => ({
  trackPublicEvent: mocks.trackPublicEvent,
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import Home from "@/app/(site)/page";

describe("Home WhatsApp CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tracks the closing WhatsApp CTA by origin without visitor data", async () => {
    render(await Home());

    const cta = screen.getByRole("link", { name: /vamos imaginar seu ensaio/i });
    cta.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(cta);

    expect(cta).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/\d+\?text=/));
    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({
      name: "experience_whatsapp_clicked",
      source: "home",
    });
  });

  it("shows the number from the environment-configured WhatsApp URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_WHATSAPP_URL", "https://wa.me/5592911112222");

    render(await Home());

    expect(screen.getByRole("link", { name: /vamos imaginar seu ensaio/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/5592911112222"),
    );
    expect(screen.getByText("WhatsApp · (92) 91111-2222")).toBeInTheDocument();
  });
});
