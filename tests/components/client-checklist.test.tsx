import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortalTask } from "@/domain/portal/types";
import { ClientChecklist } from "@/components/client/client-checklist";

const mocks = vi.hoisted(() => ({
  browserClient: { from: vi.fn() },
  refresh: vi.fn(),
  setClientTaskStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => mocks.browserClient,
}));
vi.mock("@/domain/portal/checklist", () => ({
  setClientTaskStatus: mocks.setClientTaskStatus,
}));

const actionableTask: PortalTask = {
  id: "00000000-0000-4000-8000-000000000001",
  shootId: "00000000-0000-4000-8000-000000000011",
  type: "figurino",
  title: "Separar os looks",
  status: "pendente",
  dueAt: "2026-09-10T14:30:00Z",
  visibleToClient: true,
  clientActionable: true,
  completedAt: null,
  createdAt: "2026-09-06T12:00:00Z",
};

const readOnlyTask: PortalTask = {
  ...actionableTask,
  id: "00000000-0000-4000-8000-000000000002",
  title: "Confirmar o estúdio",
  status: "em_andamento",
  dueAt: null,
  clientActionable: false,
};

const secondActionableTask: PortalTask = {
  ...actionableTask,
  id: "00000000-0000-4000-8000-000000000003",
  title: "Enviar referências",
};

describe("ClientChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setClientTaskStatus.mockResolvedValue({
      id: actionableTask.id,
      status: "concluida",
      completedAt: "2026-09-07T12:00:00Z",
    });
  });

  it("renders actionable and studio-managed tasks with distinct semantics", () => {
    render(<ClientChecklist tasks={[actionableTask, readOnlyTask]} />);

    expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toBeEnabled();
    expect(screen.queryByLabelText(`Status de ${readOnlyTask.title}`)).not.toBeInTheDocument();
    expect(screen.getByText("Acompanhada pelo estúdio")).toBeInTheDocument();
    expect(screen.getByText(/10 set 2026 · 14:30/)).toBeInTheDocument();
  });

  it("updates through the browser client and refreshes only after success", async () => {
    render(<ClientChecklist tasks={[actionableTask, readOnlyTask]} />);

    fireEvent.change(screen.getByLabelText(`Status de ${actionableTask.title}`), {
      target: { value: "concluida" },
    });

    await waitFor(() => {
      expect(mocks.setClientTaskStatus).toHaveBeenCalledWith(
        mocks.browserClient,
        actionableTask.id,
        "concluida",
      );
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("disables status controls and announces feedback while one update is pending", async () => {
    let finishUpdate!: (value: unknown) => void;
    mocks.setClientTaskStatus.mockReturnValue(
      new Promise((resolve) => {
        finishUpdate = resolve;
      }),
    );
    render(<ClientChecklist tasks={[actionableTask, secondActionableTask]} />);

    fireEvent.change(screen.getByLabelText(`Status de ${actionableTask.title}`), {
      target: { value: "em_andamento" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toBeDisabled();
      expect(screen.getByLabelText(`Status de ${secondActionableTask.title}`)).toBeDisabled();
    });
    expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toHaveValue("pendente");
    expect(screen.getByText("Atualizando status…")).toBeInTheDocument();

    await act(async () => {
      finishUpdate({
        id: actionableTask.id,
        status: "em_andamento",
        completedAt: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toHaveValue(
        "em_andamento",
      );
      expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toBeEnabled();
    });
  });

  it("shows neutral feedback and does not refresh when the mutation fails", async () => {
    mocks.setClientTaskStatus.mockRejectedValue(new Error("raw PostgrestError"));
    render(<ClientChecklist tasks={[actionableTask, readOnlyTask]} />);

    fireEvent.change(screen.getByLabelText(`Status de ${actionableTask.title}`), {
      target: { value: "em_andamento" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível atualizar esta tarefa.",
    );
    expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toHaveValue("pendente");
    expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
