import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();
const webhookController = new WebhookController();

// Payment Webhook - handles payment_received, payment_failed, refund_initiated, refund_completed
router.post("/payment", asyncHandler(webhookController.handlePaymentWebhook));

// Reports Webhook - handles report generation and sending
router.post("/reports", asyncHandler(webhookController.handleReportWebhook));

export default router;
