# Task 1 — Public clutch rental reservation persistence

## Scope delivered

- Added nullable `shoot_id`, `guest_name`, `guest_phone`, `guest_email`, and `expires_at` to `inventory_reservations`.
- Added database checks that retain valid shoot reservations and internal rentals while permitting public rentals only when `guest_name` and `guest_phone` are present.
- Restricted `expires_at` to rental reservations.
- Generated Drizzle migration `0048_public_clutch_rental_reservations.sql`, matching snapshot, and journal entry.

## TDD evidence

### RED

Command run before production schema or migration changes:

```text
npx.cmd vitest run tests/db/public-clutch-rental-reservations-migration.test.ts tests/domain/inventory-schema.test.ts --maxWorkers=1
```

Result: 2 test files failed; 3 tests failed and 3 passed. The migration test failed because `0048_public_clutch_rental_reservations.sql` and `0048_snapshot.json` did not exist. The schema test failed because `guestName`, `guestPhone`, `guestEmail`, and `expiresAt` were absent from `inventoryReservations`.

### GREEN

After adding the schema contract and generating the migration, focused tests were run:

```text
npx.cmd vitest run tests/db/public-clutch-rental-reservations-migration.test.ts tests/domain/inventory-schema.test.ts --maxWorkers=1 --reporter=verbose
```

The migration test reported both assertions passing. The schema test was also run independently with the same worker constraint and reported 1 file passed, 4 tests passed, 0 failures.

## Self-review

- `git diff --check` completed without whitespace errors.
- Confirmed the generated snapshot marks `shoot_id` nullable, contains all four nullable public-rental fields, and records both check constraints.
- No application route or public write policy was added: this task only establishes the persistence contract.

## Note

Vitest emits an existing Vite configuration deprecation warning about native config loading. It does not affect the test outcomes.

## Review correction — internal guest email

The internal reservation branches now also require `guest_email is null`: both a `shoot` reservation and an internal `rental` reservation with `shoot_id` reject guest email data. The public rental branch remains able to store an optional guest email alongside its required name and phone.

### RED

The migration contract test was strengthened to require `guest_email is null` in both internal branches. Before changing the schema or SQL, it failed with the expected assertion: the generated constraint included guest-name and guest-phone null checks but not guest-email null checks.

### GREEN

Updated the Drizzle schema, migration SQL, and migration snapshot. Fresh verification:

```text
npx.cmd vitest run tests/db/public-clutch-rental-reservations-migration.test.ts tests/domain/inventory-schema.test.ts --maxWorkers=1
```

Result: 2 test files passed, 6 tests passed, 0 failures (13.38s). The existing Vite native-config deprecation warning remained informational only.
