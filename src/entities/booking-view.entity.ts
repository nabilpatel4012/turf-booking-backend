import { ViewEntity, ViewColumn, PrimaryColumn } from "typeorm";
import { BookingStatus } from "./booking.entity";

@ViewEntity({
  name: "booking_details_view",
  expression: `
    SELECT
      b.id,
      b.turf_id,
      b.user_id,
      b.date,
      b.start_time,
      b.end_time,
      b.total_amount,
      b.status,
      b.created_by,
      b.cancelled_at,
      b.cancellation_reason,
      b.payment_id,
      b.order_id,
      b.created_at,
      b.updated_at,
      b.paid_amount,
      b.invoice_id,
      b.payment_info,
      b.app_id,
      b.app_name,
      t.name AS turf_name,
      u.name AS user_name,
      u.phone AS user_phone,
      u.email AS user_email
    FROM bookings b
    LEFT JOIN turfs t ON b.turf_id = t.id
    LEFT JOIN users u ON b.user_id = u.id
  `,
})
export class BookingView {
  @ViewColumn()
  @PrimaryColumn()
  id: string;

  @ViewColumn({ name: "turf_id" })
  turfId: string;

  @ViewColumn({ name: "user_id" })
  userId: string;

  @ViewColumn()
  date: string;

  @ViewColumn({ name: "start_time" })
  startTime: Date;

  @ViewColumn({ name: "end_time" })
  endTime: Date;

  @ViewColumn({ name: "total_amount" })
  totalAmount: number;

  @ViewColumn()
  status: BookingStatus;

  @ViewColumn({ name: "created_by" })
  createdBy: string;

  @ViewColumn({ name: "cancelled_at" })
  cancelledAt: Date;

  @ViewColumn({ name: "cancellation_reason" })
  cancellationReason: string;

  @ViewColumn({ name: "payment_id" })
  paymentId: string;

  @ViewColumn({ name: "order_id" })
  orderId: string;

  @ViewColumn({ name: "created_at" })
  createdAt: Date;

  @ViewColumn({ name: "updated_at" })
  updatedAt: Date;

  @ViewColumn({ name: "paid_amount" })
  paidAmount: number;

  @ViewColumn({ name: "invoice_id" })
  invoiceId: string;

  @ViewColumn({ name: "payment_info" })
  paymentInfo: any;

  @ViewColumn({ name: "app_id" })
  appId: string;

  @ViewColumn({ name: "app_name" })
  appName: string;

  @ViewColumn({ name: "turf_name" })
  turfName: string;

  @ViewColumn({ name: "user_name" })
  userName: string;

  @ViewColumn({ name: "user_phone" })
  userPhone: string;

  @ViewColumn({ name: "user_email" })
  userEmail: string;
}
