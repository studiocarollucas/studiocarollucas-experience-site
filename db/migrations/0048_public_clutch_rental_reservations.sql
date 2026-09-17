ALTER TABLE "inventory_reservations" ALTER COLUMN "shoot_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD COLUMN "guest_name" text;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD COLUMN "guest_phone" text;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD COLUMN "guest_email" text;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_reservation_contact_valid" CHECK ((
        "inventory_reservations"."purpose" = 'shoot'
        and "inventory_reservations"."shoot_id" is not null
        and "inventory_reservations"."guest_name" is null
        and "inventory_reservations"."guest_phone" is null
        and "inventory_reservations"."guest_email" is null
      ) or (
        "inventory_reservations"."purpose" = 'rental' and (
          ("inventory_reservations"."shoot_id" is not null and "inventory_reservations"."guest_name" is null and "inventory_reservations"."guest_phone" is null and "inventory_reservations"."guest_email" is null)
          or ("inventory_reservations"."shoot_id" is null and "inventory_reservations"."guest_name" is not null and "inventory_reservations"."guest_phone" is not null)
        )
      ));--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_expires_at_rental_only" CHECK ("inventory_reservations"."purpose" = 'rental' or "inventory_reservations"."expires_at" is null);
