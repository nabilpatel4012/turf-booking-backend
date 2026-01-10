import { Router, Request, Response } from "express";
import { getWhatsAppService } from "../services/whatsapp.service";
import { authenticateAdmin, AuthRequest } from "../middleware/auth.middleware";
import QRCode from "qrcode";

const router = Router();

// All WhatsApp admin routes require admin authentication (only checks aAccessToken)
router.use(authenticateAdmin);

/**
 * GET /api/whatsapp/status
 * Get WhatsApp service status (admin only)
 */
router.get(
  "/status",
  async (req: AuthRequest, res: Response) => {
    try {
      const whatsAppService = getWhatsAppService();
      const status = whatsAppService.getStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("Error getting WhatsApp status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get WhatsApp status",
      });
    }
  }
);

/**
 * GET /api/whatsapp/qr
 * Get QR code for WhatsApp authentication (admin only)
 * Returns QR code as base64 image
 */
router.get(
  "/qr",
  async (req: AuthRequest, res: Response) => {
    try {
      const whatsAppService = getWhatsAppService();
      const status = whatsAppService.getStatus();

      if (!status.enabled) {
        return res.status(400).json({
          success: false,
          message: "WhatsApp service is disabled",
        });
      }

      if (status.ready) {
        return res.json({
          success: true,
          message: "WhatsApp is already authenticated",
          data: { authenticated: true },
        });
      }

      const qrCode = whatsAppService.getQRCode();

      if (!qrCode) {
        return res.status(202).json({
          success: true,
          message: "QR code not yet generated. Please wait and try again.",
          data: { authenticated: false, qrPending: true },
        });
      }

      // Generate QR code as base64 image
      const qrImage = await QRCode.toDataURL(qrCode);

      res.json({
        success: true,
        data: {
          authenticated: false,
          qrCode: qrImage,
        },
      });
    } catch (error) {
      console.error("Error getting WhatsApp QR:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get WhatsApp QR code",
      });
    }
  }
);

/**
 * POST /api/whatsapp/test
 * Send a test message (admin only, for verification)
 */
router.post(
  "/test",
  async (req: AuthRequest, res: Response) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
      }

      const whatsAppService = getWhatsAppService();

      if (!whatsAppService.isServiceReady()) {
        return res.status(400).json({
          success: false,
          message: "WhatsApp service is not ready. Please authenticate first.",
        });
      }

      // Send a test booking confirmation
      const sent = await whatsAppService.sendBookingConfirmation({
        phone,
        userName: "Test User",
        turfName: "Test Turf",
        turfAddress: "123 Test Street, Test City",
        bookingDate: new Date().toLocaleDateString("en-IN"),
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        totalAmount: 1000,
        paidAmount: 500,
        bookingId: "TEST-" + Date.now(),
      });

      if (sent) {
        res.json({
          success: true,
          message: "Test message sent successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send test message",
        });
      }
    } catch (error) {
      console.error("Error sending test message:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send test message",
      });
    }
  }
);

export default router;
