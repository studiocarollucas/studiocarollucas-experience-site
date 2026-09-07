import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientTaskAccessFields } from "@/components/admin/client-task-access-fields";

describe("ClientTaskAccessFields", () => {
  it("associates actionable and visibility field errors with their checkboxes", () => {
    render(
      <ClientTaskAccessFields
        fieldErrors={{
          visibleToClient: ["Defina a visibilidade da tarefa."],
          clientActionable: ["Uma tarefa editável pela cliente precisa estar visível."],
        }}
      />,
    );

    const visible = screen.getByRole("checkbox", { name: "Visível para a cliente" });
    const actionable = screen.getByRole("checkbox", {
      name: "A cliente pode alterar o status",
    });

    expect(visible).toHaveAttribute("aria-invalid", "true");
    expect(visible).toHaveAccessibleDescription("Defina a visibilidade da tarefa.");
    expect(actionable).toHaveAttribute("aria-invalid", "true");
    expect(actionable).toHaveAccessibleDescription(
      "Uma tarefa editável pela cliente precisa estar visível.",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("clears and disables actionable when client visibility is removed", () => {
    render(<ClientTaskAccessFields />);
    const visible = screen.getByRole("checkbox", { name: "Visível para a cliente" });
    const actionable = screen.getByRole("checkbox", {
      name: "A cliente pode alterar o status",
    });

    fireEvent.click(actionable);
    expect(actionable).toBeChecked();

    fireEvent.click(visible);
    expect(visible).not.toBeChecked();
    expect(actionable).not.toBeChecked();
    expect(actionable).toBeDisabled();
  });
});
