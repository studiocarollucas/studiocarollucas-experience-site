import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyShoot } from "@/components/client/my-shoot";

const snapshot = {
  client: { id: "client-1", name: "Mariana" },
  viewerAuthUserId: "auth-1",
  shoot: {
    id: "shoot-1",
    clientId: "client-1",
    experiencePackageId: "package-1",
    shootDate: "2026-09-18",
    startTime: "15:00:00",
    status: "preparacao" as const,
    agreedPrice: "1000.00",
    paymentStatus: "parcial",
    portalEnabled: true,
    locationName: "Studio Carol Lucas",
    locationAddress: "Rua das Flores, 120",
    clientGuidance: "Chegue 15 minutos antes.",
  },
  experience: {
    id: "package-1",
    name: "Aurora",
    includedPhotos: 20,
    durationMinutes: 90,
    scenes: "2",
    makeIncluded: true,
    outfitsLimit: 3,
    clutchIncluded: true,
  },
  tasks: [],
  payments: [
    {
      id: "payment-1",
      shootId: "shoot-1",
      amount: "250.00",
      paidAt: "2026-09-01T12:00:00Z",
      status: "confirmado" as const,
    },
  ],
  references: [],
};

describe("MyShoot", () => {
  it("shows the client-safe experience, logistics, and confirmed financial summary", () => {
    render(<MyShoot snapshot={snapshot} contactUrl="https://wa.me/5592999999999" />);

    expect(screen.getByRole("heading", { name: "Meu ensaio" })).toBeInTheDocument();
    expect(screen.getByText("Aurora")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 250,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 750,00")).toBeInTheDocument();
    expect(screen.getByText("Studio Carol Lucas")).toBeInTheDocument();
    expect(screen.getByText("Rua das Flores, 120")).toBeInTheDocument();
    expect(screen.getByText("Chegue 15 minutos antes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Falar com o estúdio" })).toHaveAttribute(
      "href",
      "https://wa.me/5592999999999"
    );
    expect(screen.queryByText(/comprovante|observações internas/i)).not.toBeInTheDocument();
  });

  it("guides the client when logistics and the contact URL are not configured", () => {
    render(
      <MyShoot
        snapshot={{
          ...snapshot,
          shoot: {
            ...snapshot.shoot,
            locationName: null,
            locationAddress: null,
            clientGuidance: null,
          },
        }}
      />
    );

    expect(screen.getByText("Confirme com o estúdio")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Falar com o estúdio" })).not.toBeInTheDocument();
    expect(screen.getByText(/contato habitual do estúdio/i)).toBeInTheDocument();
  });

  it("renders a welcoming empty state when no shoot is available", () => {
    render(
      <MyShoot
        snapshot={{ ...snapshot, shoot: null, experience: null, tasks: [], payments: [] }}
        contactUrl="https://wa.me/5592999999999"
      />
    );

    expect(screen.getByRole("heading", { name: "Meu ensaio" })).toBeInTheDocument();
    expect(screen.getByText(/quando os detalhes forem liberados/i)).toBeInTheDocument();
    expect(screen.queryByText("R$ 1.000,00")).not.toBeInTheDocument();
  });
});
