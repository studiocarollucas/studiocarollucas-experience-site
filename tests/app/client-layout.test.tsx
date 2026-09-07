import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MinhaExperienciaLayout from "@/app/(client)/minha-experiencia/layout";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/domain/portal/server", () => ({
  getPortalRequestContext: vi.fn().mockResolvedValue({
    client: { id: "client", name: "Cliente" },
    viewerAuthUserId: "auth-user",
    shoot: null,
  }),
}));
vi.mock("@/components/client/client-nav", () => ({ ClientNav: () => <nav>Portal</nav> }));
vi.mock("@/components/client/client-sign-out-button", () => ({
  ClientSignOutButton: () => <button type="button">Sair</button>,
}));

describe("Minha Experiência layout", () => {
  it("starts keyboard navigation with a skip link to the only main landmark", async () => {
    const view = render(
      await MinhaExperienciaLayout({
        children: <section aria-label="Conteúdo da página">Conteúdo</section>,
      })
    );

    const skipLink = screen.getByRole("link", { name: "Ir para o conteúdo principal" });
    const focusable = view.container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    expect(focusable[0]).toBe(skipLink);
    skipLink.focus();
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute("href", "#portal-main");

    const mains = view.container.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute("id", "portal-main");
    expect(mains[0]).toHaveAttribute("tabindex", "-1");
  });
});
