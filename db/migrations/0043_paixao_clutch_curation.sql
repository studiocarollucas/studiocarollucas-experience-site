ALTER TABLE "inventory_items" ADD COLUMN "rental_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "replacement_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "paixao_clutch_copy" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "paixao_clutch_public_image_path" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "paixao_clutch_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "paixao_clutch_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "paixao_clutch_sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_rental_price_nonnegative" CHECK ("inventory_items"."rental_price" is null or "inventory_items"."rental_price" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_replacement_value_nonnegative" CHECK ("inventory_items"."replacement_value" is null or "inventory_items"."replacement_value" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_paixao_clutch_sort_order_nonnegative" CHECK ("inventory_items"."paixao_clutch_sort_order" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_paixao_clutch_only" CHECK ("inventory_items"."type" = 'clutch' or (
      "inventory_items"."rental_price" is null
      and "inventory_items"."replacement_value" is null
      and "inventory_items"."paixao_clutch_copy" is null
      and "inventory_items"."paixao_clutch_public_image_path" is null
      and "inventory_items"."paixao_clutch_published" = false
      and "inventory_items"."paixao_clutch_featured" = false
      and "inventory_items"."paixao_clutch_sort_order" = 0
    ));--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_paixao_clutch_publication_valid" CHECK ("inventory_items"."paixao_clutch_published" = false or (
      "inventory_items"."type" = 'clutch'
      and "inventory_items"."active" = true
      and "inventory_items"."status" = 'available'
      and "inventory_items"."rental_price" is not null
      and nullif(btrim("inventory_items"."paixao_clutch_copy"), '') is not null
      and nullif(btrim("inventory_items"."paixao_clutch_public_image_path"), '') is not null
    ));