// Jalankan dari repo root: bun run db:migrate
// (script root mendelegasikan ke backend, jadi cwd = backend/)
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const url =
  process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/novelcraft";

const connection = await mysql.createConnection({ uri: url });
const db = drizzle(connection);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✅ Migrasi selesai.");
await connection.end();
process.exit(0);
