import { Resend } from "resend";
import { render } from "@react-email/components";
import {
  BookingConfirmation,
  BookingCancellation,
  OTPVerification,
} from "../emails";
import * as React from "react";

// Types
export interface BookingEmailData {
  userName: string;
  userEmail: string;
  turfName: string;
  turfAddress: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  paidAmount?: number;
  bookingId: string;
  orderId?: string;
}

export interface CancellationEmailData extends BookingEmailData {
  cancellationReason?: string;
  cancelledBy: "user" | "admin";
  refundAmount?: number;
}

export interface OTPEmailData {
  userName: string;
  userEmail: string;
  otp: string;
  expiryMinutes?: number;
}

export interface PaymentEmailData {
  userEmail: string;
  userName: string;
  eventType: "payment_received" | "payment_failed" | "refund_initiated" | "refund_completed";
  amount: number;
  bookingId?: string;
  orderId?: string;
  transactionId?: string;
  reason?: string;
}

export interface ReportEmailData {
  recipientEmail: string;
  recipientName: string;
  reportType: "booking_summary" | "revenue_report" | "custom";
  reportTitle: string;
  reportContent: string;
  attachmentUrl?: string;
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set. Email service will not work.");
    }
    this.resend = new Resend(apiKey || "");
    this.fromEmail = process.env.FROM_EMAIL || "NexSports <bookings@notifications.nexsports.in>";
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    try {
      const html = await render(
        React.createElement(BookingConfirmation, {
          userName: data.userName,
          turfName: data.turfName,
          turfAddress: data.turfAddress,
          bookingDate: data.bookingDate,
          startTime: data.startTime,
          endTime: data.endTime,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          bookingId: data.bookingId,
          orderId: data.orderId,
        })
      );

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.userEmail,
        subject: `Booking Confirmed - ${data.turfName}`,
        html,
      });

      console.log(`Booking confirmation email sent to ${data.userEmail}:`, result);
      return true;
    } catch (error) {
      console.error("Failed to send booking confirmation email:", error);
      return false;
    }
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(data: CancellationEmailData): Promise<boolean> {
    try {
      const html = await render(
        React.createElement(BookingCancellation, {
          userName: data.userName,
          turfName: data.turfName,
          turfAddress: data.turfAddress,
          bookingDate: data.bookingDate,
          startTime: data.startTime,
          endTime: data.endTime,
          totalAmount: data.totalAmount,
          bookingId: data.bookingId,
          cancellationReason: data.cancellationReason,
          cancelledBy: data.cancelledBy,
          refundAmount: data.refundAmount,
        })
      );

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.userEmail,
        subject: `Booking Cancelled - ${data.turfName}`,
        html,
      });

      console.log(`Booking cancellation email sent to ${data.userEmail}:`, result);
      return true;
    } catch (error) {
      console.error("Failed to send booking cancellation email:", error);
      return false;
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(data: OTPEmailData): Promise<boolean> {
    try {
      const html = await render(
        React.createElement(OTPVerification, {
          userName: data.userName,
          otp: data.otp,
          expiryMinutes: data.expiryMinutes || 10,
        })
      );

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.userEmail,
        subject: `Your NexSports Verification Code: ${data.otp}`,
        html,
      });

      console.log(`OTP email sent to ${data.userEmail}:`, result);
      return true;
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return false;
    }
  }

  /**
   * Send payment-related email (generic)
   */
  async sendPaymentEmail(data: PaymentEmailData): Promise<boolean> {
    try {
      const subjectMap = {
        payment_received: "Payment Received Successfully",
        payment_failed: "Payment Failed",
        refund_initiated: "Refund Initiated",
        refund_completed: "Refund Completed",
      };

      const subject = subjectMap[data.eventType] || "Payment Update";

      // Simple text-based email for payment events (can be templated later)
      const htmlContent = this.generatePaymentEmailHtml(data);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.userEmail,
        subject,
        html: htmlContent,
      });

      console.log(`Payment email sent to ${data.userEmail}:`, result);
      return true;
    } catch (error) {
      console.error("Failed to send payment email:", error);
      return false;
    }
  }

  /**
   * Send report email
   */
  async sendReportEmail(data: ReportEmailData): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.recipientEmail,
        subject: data.reportTitle,
        html: this.generateReportEmailHtml(data),
      });

      console.log(`Report email sent to ${data.recipientEmail}:`, result);
      return true;
    } catch (error) {
      console.error("Failed to send report email:", error);
      return false;
    }
  }

  /**
   * Generate HTML for payment emails
   */
  private generatePaymentEmailHtml(data: PaymentEmailData): string {
    const statusColors = {
      payment_received: "#22c55e",
      payment_failed: "#ef4444",
      refund_initiated: "#f59e0b",
      refund_completed: "#22c55e",
    };

    const statusMessages = {
      payment_received: `Payment of ₹${data.amount} has been received successfully.`,
      payment_failed: `Payment of ₹${data.amount} has failed. ${data.reason || "Please try again."}`,
      refund_initiated: `A refund of ₹${data.amount} has been initiated.`,
      refund_completed: `Your refund of ₹${data.amount} has been completed.`,
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { background: #18181b; padding: 20px; text-align: center; }
          .logo { color: #22c55e; font-size: 28px; font-weight: bold; margin: 0; }
          .status-banner { background: ${statusColors[data.eventType]}; padding: 20px; text-align: center; color: white; }
          .content { padding: 30px; }
          .footer { background: #f4f4f5; padding: 20px; text-align: center; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1 class="logo">NexSports</h1></div>
          <div class="status-banner"><h2 style="margin:0">${data.eventType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</h2></div>
          <div class="content">
            <p>Hi ${data.userName},</p>
            <p>${statusMessages[data.eventType]}</p>
            ${data.bookingId ? `<p><strong>Booking ID:</strong> ${data.bookingId}</p>` : ""}
            ${data.transactionId ? `<p><strong>Transaction ID:</strong> ${data.transactionId}</p>` : ""}
          </div>
          <div class="footer">© 2026 NexSports. All rights reserved.</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for report emails
   */
  private generateReportEmailHtml(data: ReportEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { background: #18181b; padding: 20px; text-align: center; }
          .logo { color: #22c55e; font-size: 28px; font-weight: bold; margin: 0; }
          .content { padding: 30px; }
          .footer { background: #f4f4f5; padding: 20px; text-align: center; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1 class="logo">NexSports</h1></div>
          <div class="content">
            <h2>${data.reportTitle}</h2>
            <p>Hi ${data.recipientName},</p>
            <div>${data.reportContent}</div>
            ${data.attachmentUrl ? `<p><a href="${data.attachmentUrl}">Download Report</a></p>` : ""}
          </div>
          <div class="footer">© 2026 NexSports. All rights reserved.</div>
        </div>
      </body>
      </html>
    `;
  }
}
