import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/domain/shoots/actions", () => ({
  createShootAction: vi.fn(),
  updateShootAction: vi.fn(),
}));

import { NewShootForm } from "@/app/admin/(protected)/agenda/novo/new-shoot-form";
import { EditShootPanel } from "@/app/admin/(protected)/agenda/[id]/edit-shoot-panel";

describe("Admin shoot logistics fields", () => {
  beforeEach(() => vi.clearAllMocks());

  it("collects client-safe logistics when creating a shoot", () => {
    render(<NewShootForm clients={[]} packages={[]} />);

    expect(screen.getByLabelText("Local")).toHaveAttribute("name", "locationName");
    expect(screen.getByLabelText("Endereço / ponto de encontro")).toHaveAttribute(
      "name",
      "locationAddress",
    );
    expect(screen.getByLabelText("Orientações para a cliente")).toHaveAttribute(
      "name",
      "clientGuidance",
    );
  });

  it("shows the current logistics values when editing a shoot", () => {
    render(
      <EditShootPanel
        id="shoot-1"
        initialValues={{
          startTime: "15:00",
          agreedPrice: "1000.00",
          participantCount: 1,
          occasion: "Retrato",
          referral: "Instagram",
          notes: "Nota interna",
          locationName: "Studio Carol Lucas",
          locationAddress: "Rua das Flores, 120",
          clientGuidance: "Chegue 15 minutos antes.",
          portalEnabled: true,
        }}
      />,
    );

    expect(screen.getByLabelText("Local")).toHaveValue("Studio Carol Lucas");
    expect(screen.getByLabelText("Endereço / ponto de encontro")).toHaveValue(
      "Rua das Flores, 120",
    );
    expect(screen.getByLabelText("Orientações para a cliente")).toHaveValue(
      "Chegue 15 minutos antes.",
    );
  });
});
