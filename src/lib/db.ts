import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  return drizzle(neon(url), { schema });
}

// Lazy proxy: any property access (.select, .insert, .update, .execute, .transaction)
// instantiates the client only at request time, not at module import.
export const db = new Proxy({} as ReturnType<typeof getClient>, {
  get(_t, prop) {
    const client = getClient();
    const value = client[prop as keyof typeof client];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { schema };
