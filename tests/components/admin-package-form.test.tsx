import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/domain/catalog/actions", () => ({
  createExperienceFamilyAction: vi.fn(),
  updateExperienceFamilyAction: vi.fn(),
  createExperiencePackageAction: vi.fn(),
  updateExperiencePackageAction: vi.fn(),
}));

import { PackageForm } from "@/components/admin/catalog/package-form";
import { FamilyForm } from "@/components/admin/catalog/family-form";

describe("PackageForm", () => {
  it("collects the fields that control quiz recommendation", () => {
    render(<PackageForm families={[{ id: "f1", name: "Gestante", active: true }]} />);

    expect(screen.getByLabelText("Família")).toBeInTheDocument();
    expect(screen.getByLabelText("Limite de looks / trocas")).toHaveAttribute(
      "name",
      "outfitsLimit",
    );
    expect(screen.getByLabelText("Disponível no quiz")).toHaveAttribute(
      "name",
      "quizEligible",
    );
    expect(screen.getByLabelText("Permite paleta inicial")).toHaveAttribute(
      "name",
      "paletteEligible",
    );
  });
});

describe("FamilyForm", () => {
  it("collects the visibility controls for an experience family", () => {
    render(<FamilyForm />);

    expect(screen.getByLabelText("Nome da família")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
    expect(screen.getByLabelText("Ativa no Studio OS")).toBeInTheDocument();
    expect(screen.getByLabelText("Publicada no site")).toBeInTheDocument();
  });
});
