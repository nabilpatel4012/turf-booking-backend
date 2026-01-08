import { Request, Response } from "express";
import { EmailService, PaymentEmailData, ReportEmailData } from "../services/email.service";

const emailService = new EmailService();

export class WebhookController {
  /**
   * Handle payment webhook events
   * Supports: payment_received, payment_failed, refund_initiated, refund_completed
   */
  handlePaymentWebhook = async (req: Request, res: Response) => {
    const {
      eventType,
      userEmail,
      userName,
      amount,
      bookingId,
      orderId,
      transactionId,
      reason,
    } = req.body;

    // Validate required fields
    if (!eventType || !userEmail || !userName || amount === undefined) {
      return res.status(400).json({
        error: "Missing required fields: eventType, userEmail, userName, amount",
      });
    }

    // Validate event type
    const validEventTypes = [
      "payment_received",
      "payment_failed",
      "refund_initiated",
      "refund_completed",
    ];
    
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        error: `Invalid eventType. Must be one of: ${validEventTypes.join(", ")}`,
      });
    }

    try {
      const paymentData: PaymentEmailData = {
        eventType,
        userEmail,
        userName,
        amount,
        bookingId,
        orderId,
        transactionId,
        reason,
      };

      const sent = await emailService.sendPaymentEmail(paymentData);

      if (sent) {
        res.json({
          success: true,
          message: `Payment email sent for ${eventType}`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to send payment email",
        });
      }
    } catch (error) {
      console.error("Payment webhook error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  };

  /**
   * Handle report webhook events
   * Supports: booking_summary, revenue_report, custom
   */
  handleReportWebhook = async (req: Request, res: Response) => {
    const {
      reportType,
      recipientEmail,
      recipientName,
      reportTitle,
      reportContent,
      attachmentUrl,
    } = req.body;

    // Validate required fields
    if (!reportType || !recipientEmail || !recipientName || !reportTitle || !reportContent) {
      return res.status(400).json({
        error: "Missing required fields: reportType, recipientEmail, recipientName, reportTitle, reportContent",
      });
    }

    // Validate report type
    const validReportTypes = ["booking_summary", "revenue_report", "custom"];
    
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        error: `Invalid reportType. Must be one of: ${validReportTypes.join(", ")}`,
      });
    }

    try {
      const reportData: ReportEmailData = {
        reportType,
        recipientEmail,
        recipientName,
        reportTitle,
        reportContent,
        attachmentUrl,
      };

      const sent = await emailService.sendReportEmail(reportData);

      if (sent) {
        res.json({
          success: true,
          message: `Report email sent: ${reportTitle}`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to send report email",
        });
      }
    } catch (error) {
      console.error("Report webhook error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  };
}
