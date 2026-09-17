"use server";

import { createPublicClutchRentalReservation } from "@/domain/inventory/public-rental-reservation";
import { InventoryItemUnavailableError, InventoryReservationConflictError } from "@/domain/inventory/reservations";
import { brazilianWhatsAppSchema, brazilianWhatsAppMessage } from "@/domain/inventory/public-rental-reservation-schema";

export type PublicClutchReservationActionState =
  | {
    ok: true;
    expiresAt: string;
  }
  | {
    ok: false;
    message: string;
    fieldErrors?: Partial<Record<"startsOn" | "endsOn" | "guestName" | "guestPhone" | "guestEmail", string>>;
  }
  | null;

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function invalidSubmission(fieldErrors: NonNullable<Extract<PublicClutchReservationActionState, { ok: false }> ["fieldErrors"]>) {
  return { ok: false as const, message: "Revise os dados informados e tente novamente.", fieldErrors };
}

/**
 * Deliberately receives only a public slug. The domain resolves the associated
 * inventory item after checking its public publication state.
 */
export async function submitPublicClutchRentalReservationAction(
  slug: string,
  _previousState: PublicClutchReservationActionState,
  formData: FormData,
): Promise<PublicClutchReservationActionState> {
  const input = {
    slug,
    startsOn: formValue(formData, "startsOn"),
    endsOn: formValue(formData, "endsOn"),
    guestName: formValue(formData, "guestName"),
    guestPhone: formValue(formData, "guestPhone"),
    guestEmail: formValue(formData, "guestEmail"),
  };

  const fieldErrors: NonNullable<Extract<PublicClutchReservationActionState, { ok: false }> ["fieldErrors"]> = {};
  if (!input.startsOn) fieldErrors.startsOn = "Informe a data de retirada.";
  if (!input.endsOn) fieldErrors.endsOn = "Informe a data de devolução.";
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
    fieldErrors.endsOn = "A devolução deve ser igual ou posterior à retirada.";
  }
  if (input.guestName.trim().length < 2) fieldErrors.guestName = "Informe seu nome.";
  if (!brazilianWhatsAppSchema.safeParse(input.guestPhone).success) fieldErrors.guestPhone = brazilianWhatsAppMessage;
  if (Object.keys(fieldErrors).length) return invalidSubmission(fieldErrors);

  try {
    const reservation = await createPublicClutchRentalReservation(input);
    return {
      ok: true,
      expiresAt: reservation.expiresAt,
    };
  } catch (error) {
    if (
      error instanceof InventoryItemUnavailableError ||
      error instanceof InventoryReservationConflictError ||
      (error instanceof Error && /conflito|indisponível/i.test(error.message))
    ) {
      return { ok: false, message: "Esta clutch está indisponível para este período. Escolha outras datas ou consulte-nos pelo WhatsApp." };
    }

    if (error instanceof Error && /devolução anterior/i.test(error.message)) {
      return invalidSubmission({ endsOn: "A devolução deve ser igual ou posterior à retirada." });
    }

    return { ok: false, message: "Não foi possível enviar seu pedido agora. Revise os dados e tente novamente." };
  }
}
