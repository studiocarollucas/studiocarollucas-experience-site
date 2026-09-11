-- Staff can edit inventory through REST, but only the trusted server lifecycle
-- can write inventory_public_media. Restrictive policies compose with the
-- existing permissive staff policy, including INSERT and UPDATE/upsert.
-- Unpublished drafts/removal remain valid. Trusted server transactions bypass
-- RLS and can replace ready media before updating the item within one commit.
CREATE POLICY inventory_items_public_media_insert_provenance ON public."inventory_items"
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT "paixao_clutch_published" OR EXISTS (
      SELECT 1 FROM public."inventory_public_media" AS media
      WHERE media.inventory_item_id = inventory_items.id
        AND media.public_path = inventory_items.paixao_clutch_public_image_path
        AND media.state = 'ready'
    )
  );
--> statement-breakpoint
CREATE POLICY inventory_items_public_media_update_provenance ON public."inventory_items"
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    NOT "paixao_clutch_published" OR EXISTS (
      SELECT 1 FROM public."inventory_public_media" AS media
      WHERE media.inventory_item_id = inventory_items.id
        AND media.public_path = inventory_items.paixao_clutch_public_image_path
        AND media.state = 'ready'
    )
  );
