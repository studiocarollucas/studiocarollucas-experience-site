import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { experiencePackages } from "../schema/experience-packages.ts";

// This script runs directly via `node --experimental-strip-types` (see package.json's
// db:seed:experiences), which uses Node's native ESM resolver — it understands neither
// the "@/" tsconfig path alias nor db/client.ts's extensionless `"./schema"` directory
// import (both are TypeScript-compiler/bundler-only conveniences). So this constructs
// its own client with the same settings as db/client.ts rather than importing it.
const queryClient = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(queryClient);

const SEED_PACKAGES = [
  {
    name: "Cinderela",
    basePrice: "0.00",
    includedPhotos: 20,
    durationMinutes: 90,
    makeIncluded: true,
    clutchIncluded: false,
    active: true,
  },
  {
    name: "Bella",
    basePrice: "0.00",
    includedPhotos: 25,
    durationMinutes: 105,
    makeIncluded: true,
    clutchIncluded: true,
    active: true,
  },
  {
    name: "Aurora",
    basePrice: "0.00",
    includedPhotos: 30,
    durationMinutes: 120,
    makeIncluded: true,
    clutchIncluded: true,
    active: true,
  },
  {
    name: "Diana",
    basePrice: "0.00",
    includedPhotos: 35,
    durationMinutes: 150,
    makeIncluded: true,
    clutchIncluded: true,
    active: true,
  },
];

async function seed() {
  // basePrice is a placeholder (0.00) — real internal pricing must be entered via
  // Studio OS (Epic 2) before this catalog is used for anything financial. Seeding
  // real prices here would fabricate business data nobody has provided.
  await db.insert(experiencePackages).values(SEED_PACKAGES);
  console.log(`Seeded ${SEED_PACKAGES.length} experience packages (placeholder prices — update via Admin before launch).`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
