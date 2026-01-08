import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";
import turfRoutes from "./routes/turf.routes";
import reviewRoutes from "./routes/review.routes";
import pricingRoutes from "./routes/pricing.routes";
import settingRoutes from "./routes/setting.routes";
import adminRoutes from "./routes/admin.routes";
import publicRoutes from "./routes/public.routes";
import analyticsRoutes from "./routes/analytics.routes";
import uploadRoutes from "./routes/upload.routes";
import webhookRoutes from "./routes/webhook.routes";
import { errorHandler } from "./middleware/error.middleware";
import "reflect-metadata";

const app = express();

// Security Headers
app.use(helmet());
app.disable("x-powered-by");
app.set("trust proxy", 1); // Trust first proxy (e.g. Nginx/Cloudflare)

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 120, // Limit each IP to 120 requests per `window` (here, per 1 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use("/api", limiter); // Apply to API routes

const corsOptions = {
  origin: [
    "http://localhost:3001",
    "http://localhost:8080",
    "https://app.nexsports.in",
    "https://gomyturf.pages.dev",
    "https://admin.nexsports.in"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Forwarded-For"],
};

// Allow any origin for the update payment status endpoint (Webhook/External)
app.use("/api/bookings/update-payment-status", cors({ origin: "*" }));
app.options("/api/bookings/update-payment-status", cors({ origin: "*" }));

// Allow any origin for webhooks (External services)
app.use("/api/webhooks", cors({ origin: "*" }));
app.options("/api/webhooks", cors({ origin: "*" }));

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10kb" })); // Body limit
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10kb" }));


// Prevent Parameter Pollution
app.use(hpp());

// ETag Configuration (Weak by default in Express, explicitly setting if needed or leaving default)
app.set('etag', 'weak'); 

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", publicRoutes);
app.use("/api", uploadRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(errorHandler);

export default app;
