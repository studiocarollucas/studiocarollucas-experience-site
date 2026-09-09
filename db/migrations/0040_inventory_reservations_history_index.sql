CREATE INDEX "inventory_reservations_shoot_dates_idx" ON "inventory_reservations" USING btree ("shoot_id","starts_on");
