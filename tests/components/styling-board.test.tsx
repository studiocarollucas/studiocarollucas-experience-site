import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StylingBoard } from "@/components/client/styling-board";
import type { PortalReference } from "@/domain/portal/types";

const mocks = vi.hoisted(() => ({
  browserClient: { source: "browser-jwt" },
  captureException: vi.fn(),
  deleteStylingReference: vi.fn(),
  refresh: vi.fn(),
  uploadStylingReference: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => mocks.browserClient,
}));
vi.mock("@/domain/styling/client", () => ({
  deleteStylingReference: mocks.deleteStylingReference,
  uploadStylingReference: mocks.uploadStylingReference,
}));

const SHOOT_ID = "00000000-0000-4000-8000-000000000011";
const VIEWER_ID = "00000000-0000-4000-8000-000000000001";

const ownReference: PortalReference = {
  id: "00000000-0000-4000-8000-000000000021",
  shootId: SHOOT_ID,
  storagePath: `${VIEWER_ID}/${SHOOT_ID}/one.webp`,
  signedUrl: "https://private.example.test/one?token=signed",
  caption: "Luz suave",
  origin: "client",
  uploadedByAuthUserId: VIEWER_ID,
  createdAt: "2026-09-07T12:00:00Z",
};

const studioReference: PortalReference = {
  ...ownReference,
  id: "00000000-0000-4000-8000-000000000022",
  storagePath: "00000000-0000-4000-8000-000000000099/shoot/studio.jpg",
  signedUrl: "https://private.example.test/studio?token=signed",
  caption: null,
  origin: "studio",
  uploadedByAuthUserId: "00000000-0000-4000-8000-000000000099",
};

describe("StylingBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadStylingReference.mockResolvedValue({ id: ownReference.id });
    mocks.deleteStylingReference.mockResolvedValue(undefined);
  });

  it("invites the first reference and explains the private upload limits", () => {
    render(<StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[]} />);

    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG ou WebP/i)).toHaveTextContent(/8 MB.*20 imagens/i);
    expect(screen.getByLabelText(/escolher imagem/i)).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp"
    );
    expect(screen.getByLabelText(/legenda/i)).toHaveAttribute("maxLength", "500");
  });

  it("shows signed images chronologically and only allows the client to remove their own", () => {
    render(
      <StylingBoard
        shootId={SHOOT_ID}
        viewerAuthUserId={VIEWER_ID}
        references={[ownReference, studioReference]}
      />
    );

    expect(screen.getByRole("img", { name: "Luz suave" })).toHaveAttribute(
      "src",
      ownReference.signedUrl
    );
    expect(screen.getByRole("img", { name: "Luz suave" })).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("img", { name: "Luz suave" })).toHaveAttribute("decoding", "async");
    expect(screen.getByRole("img", { name: "Referência de styling" })).toHaveAttribute(
      "src",
      studioReference.signedUrl
    );
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("Estúdio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover referência Luz suave" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Remover referência do estúdio" })
    ).not.toBeInTheDocument();
  });

  it("lets Admin remove every reference", () => {
    render(
      <StylingBoard
        shootId={SHOOT_ID}
        viewerAuthUserId={VIEWER_ID}
        references={[studioReference]}
        origin="studio"
        canDeleteAll
      />
    );

    expect(screen.getByRole("button", { name: "Remover referência do estúdio" })).toBeEnabled();
  });

  it("does not offer a client delete for a studio reference attributed to their user", () => {
    const delegatedStudioReference: PortalReference = {
      ...studioReference,
      id: "00000000-0000-4000-8000-000000000023",
      caption: "Curadoria delegada",
      uploadedByAuthUserId: VIEWER_ID,
    };

    render(
      <StylingBoard
        shootId={SHOOT_ID}
        viewerAuthUserId={VIEWER_ID}
        references={[delegatedStudioReference]}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Remover referência Curadoria delegada" })
    ).not.toBeInTheDocument();
  });

  it("disables all mutations and announces upload progress", async () => {
    let finishUpload!: (value: unknown) => void;
    mocks.uploadStylingReference.mockReturnValue(
      new Promise((resolve) => {
        finishUpload = resolve;
      })
    );
    render(
      <StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[ownReference]} />
    );

    fireEvent.change(screen.getByLabelText(/escolher imagem/i), {
      target: {
        files: [new File(["image"], "referencia.png", { type: "image/png" })],
      },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Adicionar referência" }).closest("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent("Enviando referência…");
    expect(screen.getByRole("button", { name: "Adicionar referência" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remover referência Luz suave" })).toBeDisabled();

    await act(async () => finishUpload({ id: ownReference.id }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });

  it("passes authenticated ownership fields and refreshes after a successful upload", async () => {
    render(<StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[]} />);
    const file = new File(["image"], "referencia.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/escolher imagem/i), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/legenda/i), { target: { value: "Editorial leve" } });
    fireEvent.submit(screen.getByRole("button", { name: "Adicionar referência" }).closest("form")!);

    await waitFor(() => {
      expect(mocks.uploadStylingReference).toHaveBeenCalledWith(mocks.browserClient, {
        file,
        shootId: SHOOT_ID,
        authUserId: VIEWER_ID,
        caption: "Editorial leve",
        origin: "client",
        currentCount: 0,
      });
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Referência adicionada.");
  });

  it("shows a neutral alert and does not refresh when upload fails", async () => {
    mocks.uploadStylingReference.mockRejectedValue(new Error("raw PostgREST details"));
    render(<StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[]} />);
    fireEvent.change(screen.getByLabelText(/escolher imagem/i), {
      target: { files: [new File(["image"], "ref.png", { type: "image/png" })] },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Adicionar referência" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível adicionar esta referência."
    );
    expect(screen.getByRole("button", { name: "Adicionar referência" })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { operation: "styling-reference-upload" },
    });
  });

  it("does not capture allowlisted validation messages", async () => {
    mocks.uploadStylingReference.mockRejectedValue(new Error("A imagem deve ter no máximo 8 MB."));
    render(<StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[]} />);
    fireEvent.change(screen.getByLabelText(/escolher imagem/i), {
      target: { files: [new File(["image"], "ref.png", { type: "image/png" })] },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Adicionar referência" }).closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("A imagem deve ter no máximo 8 MB.");
    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  it("uses a synchronous shared lock against duplicate uploads", async () => {
    mocks.uploadStylingReference.mockReturnValue(new Promise(() => undefined));
    render(<StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[]} />);
    fireEvent.change(screen.getByLabelText(/escolher imagem/i), {
      target: { files: [new File(["image"], "ref.png", { type: "image/png" })] },
    });
    const form = screen.getByRole("button", { name: "Adicionar referência" }).closest("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(mocks.uploadStylingReference).toHaveBeenCalledOnce();
  });

  it("announces delete progress and synchronously prevents duplicate deletion", async () => {
    mocks.deleteStylingReference.mockReturnValue(new Promise(() => undefined));
    render(
      <StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[ownReference]} />
    );
    const button = screen.getByRole("button", { name: "Remover referência Luz suave" });
    await act(async () => {
      button.click();
      button.click();
    });
    expect(mocks.deleteStylingReference).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Removendo referência…");
  });

  it("logs a failed post-row object cleanup and keeps the public message neutral", async () => {
    const internalError = new Error("storage object cleanup failed");
    mocks.deleteStylingReference.mockRejectedValue(internalError);
    render(
      <StylingBoard shootId={SHOOT_ID} viewerAuthUserId={VIEWER_ID} references={[ownReference]} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover referência Luz suave" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível remover esta referência."
    );
    expect(screen.queryByText(/storage object/i)).not.toBeInTheDocument();
    expect(mocks.captureException).toHaveBeenCalledWith(internalError, {
      tags: { operation: "styling-reference-delete" },
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("trims captions and falls back for whitespace-only captions", () => {
    render(
      <StylingBoard
        shootId={SHOOT_ID}
        viewerAuthUserId={VIEWER_ID}
        references={[
          { ...ownReference, caption: "  Luz editorial  " },
          { ...studioReference, caption: "   " },
        ]}
      />
    );
    expect(screen.getByRole("img", { name: "Luz editorial" })).toBeInTheDocument();
    expect(screen.getByText("Luz editorial")).toHaveClass("break-words");
    expect(screen.getByRole("img", { name: "Referência de styling" })).toBeInTheDocument();
    expect(screen.getByText("Sem legenda")).toBeInTheDocument();
  });
});
