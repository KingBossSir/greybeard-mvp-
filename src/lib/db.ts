import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;
function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    // During `next build` page-data collection, env vars may not be present.
    // Return a stub that throws only when actually used.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return new Proxy({} as DB, {
        get() { throw new Error("DATABASE_URL accessed during build"); },
      });
    }
    throw new Error("DATABASE_URL missing");
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}

export const db: DB = new Proxy({} as DB, {
  get(_t, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
