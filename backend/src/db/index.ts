import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/novelcraft";

export const pool = mysql.createPool({ uri: url });
export const db = drizzle(pool, { schema, mode: "default" });
