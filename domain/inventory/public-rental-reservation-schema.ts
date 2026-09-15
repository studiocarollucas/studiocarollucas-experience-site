import { z } from "zod";

export const publicClutchRentalRequestSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().min(8).max(30),
  guestEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
}).refine(({ startsOn, endsOn }) => endsOn >= startsOn, {
  path: ["endsOn"], message: "devolução anterior à retirada",
});

export type PublicClutchRentalRequestInput = z.infer<typeof publicClutchRentalRequestSchema>;

export type PublicRentalReservationResult = {
  reservationCode: string;
  status: "pending";
  expiresAt: string;
};

export const publicClutchRentalDecisionSchema = z.object({
  reservationId: z.string().uuid(),
  decision: z.enum(["approve", "release"]),
});

export type PublicClutchRentalDecisionInput = z.infer<typeof publicClutchRentalDecisionSchema>;
