import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema";

const SEED_USERS = [
  { name: "Alice Johnson", email: "alice@ajaia.dev", avatarColor: "#6366f1" },
  { name: "Bob Smith", email: "bob@ajaia.dev", avatarColor: "#10b981" },
  { name: "Carol Davis", email: "carol@ajaia.dev", avatarColor: "#f59e0b" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(sql);

  // Idempotent: re-running keeps existing IDs and just refreshes name/color.
  for (const u of SEED_USERS) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: { name: u.name, avatarColor: u.avatarColor },
      });
  }

  const rows = await db.select().from(users);
  console.log(`Seeded ${rows.length} users:`, rows.map((r) => r.email).join(", "));
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
