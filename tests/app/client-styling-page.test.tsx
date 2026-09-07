import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serverClient: { source: "cookie-jwt" },
  createSupabaseServerClient: vi.fn(),
  readPortalSnapshot: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/domain/portal/read", () => ({ readPortalSnapshot: mocks.readPortalSnapshot }));

import ClientStylingPage from "@/app/(client)/minha-experiencia/styling/page";

describe("ClientStylingPage", () => {
  it("uses one cookie-bound portal snapshot for the selected shoot board", async () => {
    mocks.createSupabaseServerClient.mockResolvedValueOnce(mocks.serverClient);
    mocks.readPortalSnapshot.mockResolvedValueOnce({
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
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.readPortalSnapshot).toHaveBeenCalledWith(mocks.serverClient);
  });

  it("guides the client when no eligible shoot exists", async () => {
    mocks.createSupabaseServerClient.mockResolvedValueOnce(mocks.serverClient);
    mocks.readPortalSnapshot.mockResolvedValueOnce({
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
