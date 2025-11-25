import Razorpay from "razorpay";
import crypto from "crypto";
import { AppError } from "../middleware/error.middleware";
import dotenv from "dotenv";

dotenv.config();

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn("Razorpay keys are missing in .env");
    }

    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "test_key_id",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "test_key_secret",
    });
  }

  async createOrder(amount: number, receipt: string) {
    try {
      const options = {
        amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
        currency: "INR",
        receipt: receipt,
      };
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      throw new AppError("Failed to create payment order", 500);
    }
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    const text = orderId + "|" + paymentId;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "test_key_secret")
      .update(text)
      .digest("hex");

    return generated_signature === signature;
  }
}
