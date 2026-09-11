ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_paixao_clutch_only";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_paixao_clutch_publication_valid";--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "paixao_clutch_slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_paixao_clutch_slug_unique" ON "inventory_items" USING btree ("paixao_clutch_slug") WHERE "inventory_items"."paixao_clutch_slug" is not null;--> statement-breakpoint
UPDATE "inventory_items"
SET "paixao_clutch_slug" = 'clutch-' || coalesce(nullif(regexp_replace(
  regexp_replace(translate(lower(btrim("code")), 'áàâãäåçéèêëíìîïñóòôõöúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'), '[^a-z0-9]+', '-', 'g'),
  '(^-+|-+$)',
  '',
  'g'
), ''), 'code') || CASE
  WHEN "code" = btrim("code") AND "code" ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' THEN ''
  ELSE '--' || encode(convert_to("code", 'UTF8'), 'hex')
END
WHERE "paixao_clutch_published" = true;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_paixao_clutch_only" CHECK ("inventory_items"."type" = 'clutch' or (
      "inventory_items"."rental_price" is null
      and "inventory_items"."replacement_value" is null
      and "inventory_items"."paixao_clutch_copy" is null
      and "inventory_items"."paixao_clutch_public_image_path" is null
      and "inventory_items"."paixao_clutch_slug" is null
      and "inventory_items"."paixao_clutch_published" = false
      and "inventory_items"."paixao_clutch_eligible" = false
      and "inventory_items"."paixao_clutch_featured" = false
      and "inventory_items"."paixao_clutch_sort_order" = 0
    ));--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_paixao_clutch_publication_valid" CHECK ("inventory_items"."paixao_clutch_published" = false or (
      "inventory_items"."type" = 'clutch'
      and "inventory_items"."paixao_clutch_eligible" = true
      and "inventory_items"."active" = true
      and "inventory_items"."status" = 'available'
      and "inventory_items"."rental_price" is not null
      and nullif(btrim("inventory_items"."paixao_clutch_copy"), '') is not null
      and nullif(btrim("inventory_items"."paixao_clutch_public_image_path"), '') is not null
      and nullif(btrim("inventory_items"."paixao_clutch_slug"), '') is not null
      and "inventory_items"."paixao_clutch_slug" = btrim("inventory_items"."paixao_clutch_slug")
    ));
