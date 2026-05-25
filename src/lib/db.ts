import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgresql://build:build@localhost/build";
// During `next build`, env may not be set — use a placeholder client that
// never actually executes (build only inspects types). Real env at runtime.
export const db = drizzle(neon(url), { schema });
export { schema };
