import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JourneyHome } from "@/components/client/journey-home";

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
    locationName: null,
    locationAddress: null,
    clientGuidance: null,
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
  tasks: [
    {
      id: "done",
      shootId: "shoot-1",
      type: "moodboard",
      title: "Moodboard",
      status: "concluida" as const,
      dueAt: null,
      visibleToClient: true,
      clientActionable: true,
      completedAt: "2026-09-01T12:00:00Z",
      createdAt: "2026-08-30T12:00:00Z",
    },
    {
      id: "next",
      shootId: "shoot-1",
      type: "figurino",
      title: "Escolher figurinos",
      status: "pendente" as const,
      dueAt: null,
      visibleToClient: true,
      clientActionable: true,
      completedAt: null,
      createdAt: "2026-08-31T12:00:00Z",
    },
  ],
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

describe("JourneyHome", () => {
  it("prioritizes the journey and one next action", () => {
    render(<JourneyHome snapshot={snapshot} today="2026-09-06" />);

    expect(screen.getByRole("heading", { name: /sua experiência aurora/i })).toBeInTheDocument();
    expect(screen.getByText("Faltam 12 dias")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("heading", { name: "Escolher figurinos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuar preparação/i })).toHaveAttribute(
      "href",
      "/minha-experiencia/styling"
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByText("Etapa atual")).toBeInTheDocument();
  });

  it("distinguishes today and omits a stale countdown", () => {
    const { rerender } = render(
      <JourneyHome
        snapshot={{ ...snapshot, shoot: { ...snapshot.shoot, shootDate: "2026-09-06" } }}
        today="2026-09-06"
      />
    );
    expect(screen.getByText("É hoje")).toBeInTheDocument();

    rerender(
      <JourneyHome
        snapshot={{ ...snapshot, shoot: { ...snapshot.shoot, shootDate: "2026-09-05" } }}
        today="2026-09-06"
      />
    );
    expect(screen.queryByText(/Faltam \d+ dias|É hoje/)).not.toBeInTheDocument();
  });

  it("routes non-styling preparation to the checklist", () => {
    render(
      <JourneyHome
        snapshot={{
          ...snapshot,
          tasks: [
            {
              ...snapshot.tasks[1],
              type: "confirmacao_horario",
              title: "Confirmar horário",
            },
          ],
        }}
        today="2026-09-06"
      />
    );

    expect(screen.getByRole("link", { name: /continuar preparação/i })).toHaveAttribute(
      "href",
      "/minha-experiencia/checklist"
    );
  });

  it("labels a visible non-actionable styling task as a styling link", () => {
    render(
      <JourneyHome
        snapshot={{
          ...snapshot,
          tasks: [
            {
              ...snapshot.tasks[1],
              type: "figurino",
              title: "Referências de figurino",
              clientActionable: false,
            },
          ],
        }}
        today="2026-09-06"
      />
    );

    expect(screen.getByRole("link", { name: "Ver styling" })).toHaveAttribute(
      "href",
      "/minha-experiencia/styling"
    );
  });

  it("renders a welcoming empty state without an eligible shoot", () => {
    render(
      <JourneyHome
        snapshot={{ ...snapshot, shoot: null, experience: null, tasks: [], payments: [] }}
        today="2026-09-06"
      />
    );

    expect(
      screen.getByRole("heading", { name: /estamos preparando seu espaço/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quando seu próximo ensaio for liberado, toda a jornada aparecerá aqui.")
    ).toBeInTheDocument();
  });
});
