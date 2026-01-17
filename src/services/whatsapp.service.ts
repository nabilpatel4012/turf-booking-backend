import { Client, LocalAuth, Message } from "whatsapp-web.js";

// Types for WhatsApp messages
export interface BookingWhatsAppData {
  phone: string;
  userName: string;
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

export interface AdminBookingWhatsAppData {
  phone: string; // Admin's phone (Recipient)
  userPhone: string; // Customer's phone
  userName: string;
  turfName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  paidAmount: number;
  pendingAmount: number;
}

export interface CancellationWhatsAppData extends BookingWhatsAppData {
  cancellationReason?: string;
  cancelledBy: "user" | "admin";
  refundAmount?: number;
}

export interface OTPWhatsAppData {
  phone: string;
  userName: string;
  otp: string;
  expiryMinutes?: number;
}

export interface PaymentWhatsAppData {
  phone: string;
  userName: string;
  eventType: "payment_received" | "payment_failed" | "refund_initiated" | "refund_completed";
  amount: number;
  bookingId?: string;
  orderId?: string;
  transactionId?: string;
  reason?: string;
}

export class WhatsAppService {
  private client: Client;
  private isReady: boolean = false;
  private qrCode: string | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.WHATSAPP_ENABLED !== "false";
    
    if (!this.enabled) {
      console.log("WhatsApp service is disabled via WHATSAPP_ENABLED env var");
      this.client = null as any;
      return;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: ".wwebjs_auth",
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      },
    });

    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners(): void {
    this.client.on("qr", (qr: string) => {
      this.qrCode = qr;
      console.log("WhatsApp QR Code received. Scan to authenticate.");
      console.log("QR Code available at /api/whatsapp/qr endpoint");
    });

    this.client.on("ready", () => {
      this.isReady = true;
      this.qrCode = null;
      console.log("WhatsApp client is ready!");
    });

    this.client.on("authenticated", () => {
      console.log("WhatsApp client authenticated successfully");
    });

    this.client.on("auth_failure", (msg: string) => {
      console.error("WhatsApp authentication failed:", msg);
      this.isReady = false;
    });

    this.client.on("disconnected", (reason: string) => {
      console.log("WhatsApp client disconnected:", reason);
      this.isReady = false;
      // Attempt to reconnect
      setTimeout(() => {
        this.initialize();
      }, 5000);
    });
  }

  private async initialize(): Promise<void> {
    try {
      await this.client.initialize();
    } catch (error) {
      console.error("Failed to initialize WhatsApp client:", error);
    }
  }

  /**
   * Format phone number for WhatsApp
   * Ensures it has country code and @c.us suffix
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    let cleaned = phone.replace(/\D/g, "");
    
    // Add India country code if not present
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, "");
    
    return `${cleaned}@c.us`;
  }

  /**
   * Check if service is ready to send messages
   */
  isServiceReady(): boolean {
    return this.enabled && this.isReady;
  }

  /**
   * Get current QR code for authentication
   */
  getQRCode(): string | null {
    return this.qrCode;
  }

  /**
   * Get service status
   */
  getStatus(): { enabled: boolean; ready: boolean; qrPending: boolean } {
    return {
      enabled: this.enabled,
      ready: this.isReady,
      qrPending: this.qrCode !== null,
    };
  }

  /**
   * Send booking confirmation message
   */
  async sendBookingConfirmation(data: BookingWhatsAppData): Promise<boolean> {
    if (!this.isServiceReady()) {
      console.warn("WhatsApp service not ready. Skipping booking confirmation.");
      return false;
    }

    try {
      const chatId = this.formatPhoneNumber(data.phone);
      const message = this.generateBookingConfirmationMessage(data);
      
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp booking confirmation sent to ${data.phone}`);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp booking confirmation:", error);
      return false;
    }
  }

  /**
   * Send admin booking notification message
   */
  async sendAdminBookingNotification(data: AdminBookingWhatsAppData): Promise<boolean> {
    if (!this.isServiceReady()) {
      console.warn("WhatsApp service not ready. Skipping admin booking notification.");
      return false;
    }

    try {
      const chatId = this.formatPhoneNumber(data.phone);
      const message = this.generateAdminBookingMessage(data);
      
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp admin notification sent to ${data.phone}`);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp admin notification:", error);
      return false;
    }
  }

  /**
   * Send booking cancellation message
   */
  async sendBookingCancellation(data: CancellationWhatsAppData): Promise<boolean> {
    if (!this.isServiceReady()) {
      console.warn("WhatsApp service not ready. Skipping cancellation notification.");
      return false;
    }

    try {
      const chatId = this.formatPhoneNumber(data.phone);
      const message = this.generateBookingCancellationMessage(data);
      
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp cancellation notification sent to ${data.phone}`);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp cancellation notification:", error);
      return false;
    }
  }

  /**
   * Send OTP verification message
   */
  async sendOTP(data: OTPWhatsAppData): Promise<boolean> {
    if (!this.isServiceReady()) {
      console.warn("WhatsApp service not ready. Skipping OTP notification.");
      return false;
    }

    try {
      const chatId = this.formatPhoneNumber(data.phone);
      const message = this.generateOTPMessage(data);
      
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp OTP sent to ${data.phone}`);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp OTP:", error);
      return false;
    }
  }

  /**
   * Send payment notification message
   */
  async sendPaymentNotification(data: PaymentWhatsAppData): Promise<boolean> {
    if (!this.isServiceReady()) {
      console.warn("WhatsApp service not ready. Skipping payment notification.");
      return false;
    }

    try {
      const chatId = this.formatPhoneNumber(data.phone);
      const message = this.generatePaymentMessage(data);
      
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp payment notification sent to ${data.phone}`);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp payment notification:", error);
      return false;
    }
  }

  // Message template generators
  private generateBookingConfirmationMessage(data: BookingWhatsAppData): string {
    let message = `🎉 *Booking Confirmed!*\n\n`;
    message += `Hi ${data.userName},\n\n`;
    message += `Your booking at *${data.turfName}* has been confirmed.\n\n`;
    message += `📍 *Venue:* ${data.turfAddress}\n`;
    message += `📅 *Date:* ${data.bookingDate}\n`;
    message += `⏰ *Time:* ${data.startTime} - ${data.endTime}\n`;
    message += `💰 *Total Amount:* ₹${data.totalAmount}\n`;
    
    if (data.paidAmount && data.paidAmount > 0) {
      message += `✅ *Paid:* ₹${data.paidAmount}\n`;
      const remaining = data.totalAmount - data.paidAmount;
      if (remaining > 0) {
        message += `⏳ *Balance Due:* ₹${remaining}\n`;
      }
    }
    
    message += `\n🆔 *Booking ID:* ${data.bookingId}\n`;
    
    if (data.orderId) {
      message += `📝 *Order ID:* ${data.orderId}\n`;
    }
    
    message += `\n_Thank you for booking with NexSports!_`;
    
    return message;
  }

  private generateBookingCancellationMessage(data: CancellationWhatsAppData): string {
    let message = `❌ *Booking Cancelled*\n\n`;
    message += `Hi ${data.userName},\n\n`;
    message += `Your booking at *${data.turfName}* has been cancelled.\n\n`;
    message += `📅 *Date:* ${data.bookingDate}\n`;
    message += `⏰ *Time:* ${data.startTime} - ${data.endTime}\n`;
    message += `🆔 *Booking ID:* ${data.bookingId}\n`;
    
    if (data.cancellationReason) {
      message += `\n📋 *Reason:* ${data.cancellationReason}\n`;
    }
    
    message += `\n👤 *Cancelled by:* ${data.cancelledBy === "user" ? "You" : "Admin"}\n`;
    
    if (data.refundAmount && data.refundAmount > 0) {
      message += `\n💸 *Refund Amount:* ₹${data.refundAmount}\n`;
      message += `_Refund will be processed within 5-7 business days._\n`;
    }
    
    message += `\n_If you have any questions, please contact us._`;
    
    return message;
  }

  private generateOTPMessage(data: OTPWhatsAppData): string {
    const expiry = data.expiryMinutes || 10;
    
    let message = `🔐 *NexSports Verification Code*\n\n`;
    message += `Hi ${data.userName},\n\n`;
    message += `Your OTP is: *${data.otp}*\n\n`;
    message += `⏱️ This code expires in ${expiry} minutes.\n\n`;
    message += `_If you didn't request this code, please ignore this message._`;
    
    return message;
  }

  private generatePaymentMessage(data: PaymentWhatsAppData): string {
    const statusEmoji = {
      payment_received: "✅",
      payment_failed: "❌",
      refund_initiated: "🔄",
      refund_completed: "💸",
    };

    const statusText = {
      payment_received: "Payment Received",
      payment_failed: "Payment Failed",
      refund_initiated: "Refund Initiated",
      refund_completed: "Refund Completed",
    };

    let message = `${statusEmoji[data.eventType]} *${statusText[data.eventType]}*\n\n`;
    message += `Hi ${data.userName},\n\n`;
    message += `💰 *Amount:* ₹${data.amount}\n`;
    
    if (data.bookingId) {
      message += `🆔 *Booking ID:* ${data.bookingId}\n`;
    }
    
    if (data.transactionId) {
      message += `📝 *Transaction ID:* ${data.transactionId}\n`;
    }
    
    if (data.reason) {
      message += `📋 *Note:* ${data.reason}\n`;
    }
    
    message += `\n_Thank you for using NexSports!_`;
    
    return message;
  }

  private generateAdminBookingMessage(data: AdminBookingWhatsAppData): string {
    let message = `🆕 *New Booking Alert*\n\n`;
    message += `You have received a new booking for *${data.turfName}*.\n\n`;
    
    message += `👤 *Customer Details:*\n`;
    message += `Name: ${data.userName}\n`;
    message += `Phone: ${data.userPhone}\n\n`;
    
    message += `📅 *Booking Details:*\n`;
    message += `Date: ${data.bookingDate}\n`;
    message += `Time: ${data.startTime} - ${data.endTime}\n\n`;
    
    message += `💰 *Payment Status:*\n`;
    message += `Paid: ₹${data.paidAmount}\n`;
    message += `Pending: ₹${data.pendingAmount}\n\n`;
    
    message += `_This is an automated notification from NexSports._`;
    
    return message;
  }

  /**
   * Cleanup on shutdown
   */
  async destroy(): Promise<void> {
    if (this.client && this.enabled) {
      try {
        await this.client.destroy();
        console.log("WhatsApp client destroyed");
      } catch (error) {
        console.error("Error destroying WhatsApp client:", error);
      }
    }
  }
}

// Singleton instance
let whatsAppServiceInstance: WhatsAppService | null = null;

export const getWhatsAppService = (): WhatsAppService => {
  if (!whatsAppServiceInstance) {
    whatsAppServiceInstance = new WhatsAppService();
  }
  return whatsAppServiceInstance;
};
