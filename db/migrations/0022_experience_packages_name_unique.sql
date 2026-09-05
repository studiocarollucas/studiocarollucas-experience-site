-- Makes db/seeds/experience-packages.ts idempotent. Without a unique key on `name`,
-- the seed's .onConflictDoNothing() has no conflict target to key off, and a second
-- run simply appends a duplicate set (two "Aurora"s, etc.) with no way to tell them
-- apart. Verified live before applying that the 4 existing seeded rows are already
-- distinct by name (select name, count(*) ... having count(*) > 1 returned zero rows).

alter table "experience_packages" add constraint "experience_packages_name_unique" unique ("name");
