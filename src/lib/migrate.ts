import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { getDatabaseUrl } from "./env";

async function main() {
  const databaseUrl = getDatabaseUrl({ preferDirect: true });
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL required (accepted aliases: POSTGRES_URL_NON_POOLING, DATABASE_URL_NON_POOLING, POSTGRES_URL, POSTGRES_PRISMA_URL)"
    );
  }
  const sql = neon(databaseUrl);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
