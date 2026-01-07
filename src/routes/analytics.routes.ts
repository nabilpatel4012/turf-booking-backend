import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { authenticateAdmin as authMiddleware } from "../middleware/auth.middleware";

const router = Router();
const analyticsController = new AnalyticsController();

router.use(authMiddleware);

router.get("/revenue/daily", analyticsController.getDailyRevenue);
router.get("/revenue/monthly", analyticsController.getMonthlyRevenue);
router.get("/turfs/top", analyticsController.getTopPerformingTurfs);
router.get("/peak-hours", analyticsController.getPeakHours);
router.get("/customers/segmentation", analyticsController.getCustomerSegmentation);
router.get("/customers/cohorts", analyticsController.getCustomerCohorts);
router.get("/cancellations", analyticsController.getCancellationAnalytics);
router.get("/cancellations/reasons", analyticsController.getTopCancellationReasons);
router.get("/ratings/trends", analyticsController.getRatingTrends);
router.get("/forecast/bookings", analyticsController.getBookingForecast);
router.get("/kpis", analyticsController.getOperationalKPIs);

export default router;
