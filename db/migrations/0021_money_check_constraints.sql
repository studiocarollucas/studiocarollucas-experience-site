-- Backs domain/payments/schema.ts's `decimalString` regex at the database level.
-- A refund is modeled as a payment row with status 'estornado', never as a negative
-- amount — so a negative amount is always a data-entry error, and one on a
-- 'confirmado' row would be silently subtracted by balance.ts's sumConfirmed(),
-- inflating the reported balance.
--
-- This restricts the individual row `amount` only. A derived *balance* (agreed price
-- minus confirmed payments) may still legitimately go negative on overpayment, and
-- calculateBalance() deliberately does not clamp it.

alter table "payments" add constraint "payments_amount_non_negative" check ("amount" >= 0);
--> statement-breakpoint
alter table "expenses" add constraint "expenses_amount_non_negative" check ("amount" >= 0);
