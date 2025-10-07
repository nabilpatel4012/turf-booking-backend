import express from "express";
import cors from "cors"; // 1. Import the cors middleware
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

app.use(cors());

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/setting", settingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use(errorHandler);

export default app;
