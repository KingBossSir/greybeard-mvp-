import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { getDatabaseUrl } from "./env";

const url = getDatabaseUrl() ?? "postgresql://build:build@localhost/build";
if (!getDatabaseUrl() && process.env.NODE_ENV === "production") {
  console.warn(
    "[db] Missing DATABASE_URL/POSTGRES_URL-style env var; runtime queries will fail until one is set."
  );
}
// During `next build`, env may not be set — use a placeholder client that
// never actually executes (build only inspects types). Real env at runtime.
export const db = drizzle(neon(url), { schema });
export { schema };
