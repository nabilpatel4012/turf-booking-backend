import { Pool } from "pg";

export const DB = new Pool({
  user: process.env.DB_USER || "neondb_owner",
  host:
    process.env.DB_HOST ||
    "ep-summer-truth-a1rxpo26-pooler.ap-southeast-1.aws.neon.tech",
  database: process.env.DB_NAME || "neondb",
  password: process.env.DB_PASSWORD || "npg_5FONCuivErp1",
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
