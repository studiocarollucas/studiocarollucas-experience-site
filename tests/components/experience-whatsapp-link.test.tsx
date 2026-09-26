import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ trackPublicEvent: vi.fn() }));

vi.mock("@/lib/site/analytics", () => ({ trackPublicEvent: mocks.trackPublicEvent }));

import { ExperienceWhatsAppLink } from "@/components/site/experience-whatsapp-link";

describe("ExperienceWhatsAppLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the contextual href and tracks origin plus the public experience slug", () => {
    const onClick = vi.fn();
    render(
      <ExperienceWhatsAppLink
        href="https://wa.me/5592984140492?text=Ol%C3%A1"
        source="experience_detail"
        experience="gestante"
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
      >
        Falar sobre Gestante
      </ExperienceWhatsAppLink>,
    );

    const link = screen.getByRole("link", { name: "Falar sobre Gestante" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(link).toHaveAttribute("href", "https://wa.me/5592984140492?text=Ol%C3%A1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).not.toHaveAttribute("source");
    expect(link).not.toHaveAttribute("experience");
    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({
      name: "experience_whatsapp_clicked",
      source: "experience_detail",
      experience: "gestante",
    });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("tracks generic CTAs by origin only", () => {
    render(
      <ExperienceWhatsAppLink href="https://wa.me/5592984140492" source="home">
        Vamos imaginar seu ensaio
      </ExperienceWhatsAppLink>,
    );

    const link = screen.getByRole("link", { name: "Vamos imaginar seu ensaio" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({
      name: "experience_whatsapp_clicked",
      source: "home",
    });
  });
});
