import express from "express";
import cors from "cors"; // 1. Import the cors middleware
import authRoutes from "./src/routes/auth.routes";
import bookingRoutes from "./src/routes/booking.routes";
import turfRoutes from "./src/routes/turf.routes";
import reviewRoutes from "./src/routes/review.routes";
import adminRoutes from "./src/routes/admin.routes";
import publicRoutes from "./src/routes/public.routes";
import { errorHandler } from "./src/middleware/error.middleware";
import "reflect-metadata";

const app = express();

app.use(cors());

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use(errorHandler);

export default app;
