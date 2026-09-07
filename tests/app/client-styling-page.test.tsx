import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalStylingSnapshot: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/domain/portal/server", () => ({
  getPortalStylingSnapshot: mocks.getPortalStylingSnapshot,
}));

import ClientStylingPage from "@/app/(client)/minha-experiencia/styling/page";

describe("ClientStylingPage", () => {
  it("uses one cookie-bound portal snapshot for the selected shoot board", async () => {
    mocks.getPortalStylingSnapshot.mockResolvedValueOnce({
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: { id: "shoot-1" },
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    });

    render(await ClientStylingPage());

    expect(screen.getByRole("heading", { name: "Styling e referências" })).toBeInTheDocument();
    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
    expect(mocks.getPortalStylingSnapshot).toHaveBeenCalledOnce();
  });

  it("guides the client when no eligible shoot exists", async () => {
    mocks.getPortalStylingSnapshot.mockResolvedValueOnce({
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    });

    render(await ClientStylingPage());

    expect(screen.getByText(/aparecerá quando o ensaio for liberado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/escolher imagem/i)).not.toBeInTheDocument();
  });
});
