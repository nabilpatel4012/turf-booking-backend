import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { Booking } from "../entities/booking.entity";
import { Review } from "../entities/review.entity";
import { Pricing } from "../entities/pricing.entity";
import { Announcement } from "../entities/announcement.entity";
import { Setting } from "../entities/setting.entity";
import { config } from "dotenv";
config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host:
    process.env.DB_HOST ||
    "ep-summer-truth-a1rxpo26-pooler.ap-southeast-1.aws.neon.tech",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "neondb_owner",
  password: process.env.DB_PASSWORD || "npg_5FONCuivErp1",
  database: process.env.DB_NAME || "neondb",
  ssl: process.env.SSL !== "false",
  entities: [User, Booking, Review, Pricing, Announcement, Setting],
  synchronize: false, // Never use in production
  logging: process.env.NODE_ENV === "development",
});
