import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";
import turfRoutes from "./routes/turf.routes";
import reviewRoutes from "./routes/review.routes";
import pricingRoutes from "./routes/pricing.routes";
import settingRoutes from "./routes/setting.routes";
import adminRoutes from "./routes/admin.routes";
import publicRoutes from "./routes/public.routes";
import { errorHandler } from "./middleware/error.middleware";
import "reflect-metadata";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Forwarded-For"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use(errorHandler);

export default app;
