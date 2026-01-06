import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Turf } from "./turf.entity";

export enum SettingCategory {
  BOOKING = "booking",
  NOTIFICATION = "notification",
  PAYMENT = "payment",
  SECURITY = "security",
  GENERAL = "general",
}

@Entity("turf_settings")
@Index(["turfId"])
export class TurfSetting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid", unique: true })
  turfId: string;

  // Booking Settings
  @Column({ name: "booking_enabled", type: "boolean", default: true })
  bookingEnabled: boolean;

  @Column({ name: "booking_disabled_reason", type: "text", nullable: true })
  bookingDisabledReason: string;

  @Column({ name: "auto_confirm_booking", type: "boolean", default: false })
  autoConfirmBooking: boolean;

  @Column({ name: "max_booking_hours", type: "int", default: 3 })
  maxBookingHours: number;

  @Column({ name: "advance_booking_days", type: "int", default: 7 })
  advanceBookingDays: number;

  @Column({ name: "min_booking_hours", type: "int", default: 1 })
  minBookingHours: number;

  @Column({ name: "cancellation_deadline_hours", type: "int", default: 24 })
  cancellationDeadlineHours: number;

  @Column({ name: "buffer_time_minutes", type: "int", default: 0 })
  bufferTimeMinutes: number;

  // Notification Settings
  @Column({ name: "notify_on_new_booking", type: "boolean", default: true })
  notifyOnNewBooking: boolean;

  @Column({ name: "notify_on_cancellation", type: "boolean", default: true })
  notifyOnCancellation: boolean;

  @Column({ name: "notify_on_payment", type: "boolean", default: true })
  notifyOnPayment: boolean;

  @Column({ name: "reminder_before_hours", type: "int", default: 2 })
  reminderBeforeHours: number;

  // Payment Settings
  @Column({ name: "require_advance_payment", type: "boolean", default: false })
  requireAdvancePayment: boolean;

  @Column({ name: "advance_payment_amount", type: "int", default: 0 })
  advancePaymentAmount: number;

  @Column({ name: "refund_enabled", type: "boolean", default: true })
  refundEnabled: boolean;

  @Column({ name: "refund_percentage", type: "int", default: 100 })
  refundPercentage: number;

  // General Settings
  @Column({ name: "timezone", type: "varchar", default: "Asia/Kolkata" })
  timezone: string;

  @Column({ name: "maintenance_mode", type: "boolean", default: false })
  maintenanceMode: boolean;

  @Column({ name: "maintenance_message", type: "text", nullable: true })
  maintenanceMessage: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => Turf, { eager: false })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;
}
