import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
}));

vi.mock("@/app/(site)/paixao-clutch/[slug]/reservation-actions", () => ({
  submitPublicClutchRentalReservationAction: mocks.action,
}));

vi.mock("@/domain/portal/countdown", () => ({ studioDate: () => "2030-05-01" }));

import { PaixaoClutchReservationForm } from "@/components/site/paixao-clutch-reservation-form";

describe("PaixaoClutchReservationForm", () => {
  it("labels every guest field, requires the reservation essentials, and keeps inventory identifiers out of the DOM", () => {
    render(<PaixaoClutchReservationForm slug="clutch-dourada" name="Clutch dourada" />);

    expect(screen.getByRole("heading", { name: /reservar esta clutch/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/retirada/i)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(/retirada/i)).toHaveAttribute("min", "2030-05-01");
    expect(screen.getByLabelText(/devolução/i)).toBeRequired();
    expect(screen.getByLabelText(/^nome/i)).toBeRequired();
    expect(screen.getByLabelText(/whatsapp/i)).toBeRequired();
    expect(screen.getByLabelText(/whatsapp/i)).toHaveAccessibleDescription(/WhatsApp brasileiro com DDD.*55/i);
    expect(screen.getByLabelText(/e-mail/i)).not.toBeRequired();
    expect(screen.getByRole("link", { name: /consultar pelo whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar pedido/i }).closest("form")).not.toHaveAttribute("novalidate");
    expect(document.body.textContent).not.toContain("inventoryItemId");
    expect(document.body.textContent).not.toContain("private-item-id");
  });

  it("shows an accessible client error when the return date precedes pickup", () => {
    render(<PaixaoClutchReservationForm slug="clutch-dourada" name="Clutch dourada" />);

    fireEvent.change(screen.getByLabelText(/retirada/i), { target: { value: "2030-05-12" } });
    fireEvent.change(screen.getByLabelText(/devolução/i), { target: { value: "2030-05-10" } });
    fireEvent.submit(screen.getByRole("button", { name: /enviar pedido/i }).closest("form")!);

    const error = screen.getByText(/devolução deve ser igual ou posterior/i);
    expect(error).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/devolução/i)).toHaveAttribute("aria-describedby", expect.stringContaining("endsOn-error"));
  });

  it("renders a pending success receipt and disables a pending submit", async () => {
    mocks.action.mockImplementation(async () => ({
      ok: true,
      expiresAt: "2030-05-11T00:30:00.000Z",
    }));

    render(<PaixaoClutchReservationForm slug="clutch-dourada" name="Clutch dourada" />);

    fireEvent.change(screen.getByLabelText(/retirada/i), { target: { value: "2030-05-10" } });
    fireEvent.change(screen.getByLabelText(/devolução/i), { target: { value: "2030-05-12" } });
    fireEvent.change(screen.getByLabelText(/^nome/i), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: "92999990000" } });
    fireEvent.submit(screen.getByRole("button", { name: /enviar pedido/i }).closest("form")!);

    expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
    expect(await screen.findByRole("status")).toHaveTextContent(/pedido recebido/i);
    expect(screen.getByRole("status")).toHaveTextContent("10 de mai. de 2030, 20:30");
    expect(screen.getByRole("status")).not.toHaveTextContent("00000000-0000-4000-8000");
  });

  it("renders an unavailable response without private reservation data", async () => {
    mocks.action.mockImplementation(async () => ({ ok: false, message: "Esta clutch está indisponível para este período." }));

    render(<PaixaoClutchReservationForm slug="clutch-dourada" name="Clutch dourada" />);

    fireEvent.change(screen.getByLabelText(/retirada/i), { target: { value: "2030-05-10" } });
    fireEvent.change(screen.getByLabelText(/devolução/i), { target: { value: "2030-05-12" } });
    fireEvent.change(screen.getByLabelText(/^nome/i), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: "92999990000" } });
    fireEvent.submit(screen.getByRole("button", { name: /enviar pedido/i }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(/indisponível/i);
    expect(document.body.textContent).not.toContain("00000000-0000-4000-8000");
  });

  it("preserves the guest's values after a server error so the same request can be retried", async () => {
    mocks.action
      .mockResolvedValueOnce({ ok: false, message: "Esta clutch está indisponível para este período." })
      .mockResolvedValueOnce({ ok: true, expiresAt: "2030-05-11T00:30:00.000Z" });

    render(<PaixaoClutchReservationForm slug="clutch-dourada" name="Clutch dourada" />);

    const pickup = screen.getByLabelText(/retirada/i);
    const returnDate = screen.getByLabelText(/devolução/i);
    const guestName = screen.getByLabelText(/^nome/i);
    const phone = screen.getByLabelText(/whatsapp/i);
    const email = screen.getByLabelText(/e-mail/i);
    const form = screen.getByRole("button", { name: /enviar pedido/i }).closest("form")!;

    fireEvent.change(pickup, { target: { value: "2030-05-10" } });
    fireEvent.change(returnDate, { target: { value: "2030-05-12" } });
    fireEvent.change(guestName, { target: { value: "Ana Silva" } });
    fireEvent.change(phone, { target: { value: "92999990000" } });
    fireEvent.change(email, { target: { value: "ana@example.com" } });
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveTextContent(/indisponível/i);
    expect(pickup).toHaveValue("2030-05-10");
    expect(returnDate).toHaveValue("2030-05-12");
    expect(guestName).toHaveValue("Ana Silva");
    expect(phone).toHaveValue("92999990000");
    expect(email).toHaveValue("ana@example.com");

    fireEvent.submit(form);
    expect(await screen.findByRole("status")).toHaveTextContent(/pedido recebido/i);
    expect(mocks.action).toHaveBeenCalledTimes(2);
  });
});
