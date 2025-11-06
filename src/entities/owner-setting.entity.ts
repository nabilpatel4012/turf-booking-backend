import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum NotificationChannel {
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  WHATSAPP = "whatsapp",
}

@Entity("owner_settings")
@Index(["ownerId"])
export class OwnerSetting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "owner_id", type: "uuid", unique: true })
  ownerId: string;

  // Security Settings
  @Column({ name: "two_factor_enabled", type: "boolean", default: false })
  twoFactorEnabled: boolean;

  @Column({ name: "two_factor_method", type: "varchar", nullable: true })
  twoFactorMethod: string; // 'sms', 'email', 'authenticator'

  @Column({ name: "session_timeout_minutes", type: "int", default: 60 })
  sessionTimeoutMinutes: number;

  // Notification Preferences (applies to all turfs)
  @Column({ name: "email_notifications", type: "boolean", default: true })
  emailNotifications: boolean;

  @Column({ name: "sms_notifications", type: "boolean", default: false })
  smsNotifications: boolean;

  @Column({ name: "push_notifications", type: "boolean", default: true })
  pushNotifications: boolean;

  @Column({ name: "whatsapp_notifications", type: "boolean", default: false })
  whatsappNotifications: boolean;

  // Notification Types
  @Column({ name: "notify_new_booking", type: "boolean", default: true })
  notifyNewBooking: boolean;

  @Column({ name: "notify_cancellation", type: "boolean", default: true })
  notifyCancellation: boolean;

  @Column({ name: "notify_payment_received", type: "boolean", default: true })
  notifyPaymentReceived: boolean;

  @Column({ name: "notify_payment_failed", type: "boolean", default: true })
  notifyPaymentFailed: boolean;

  @Column({ name: "notify_refund", type: "boolean", default: true })
  notifyRefund: boolean;

  @Column({ name: "daily_summary", type: "boolean", default: false })
  dailySummary: boolean;

  @Column({ name: "weekly_report", type: "boolean", default: false })
  weeklyReport: boolean;

  // Communication Preferences
  @Column({ name: "preferred_language", type: "varchar", default: "en" })
  preferredLanguage: string;

  @Column({
    name: "notification_quiet_hours_start",
    type: "time",
    nullable: true,
  })
  notificationQuietHoursStart: string;

  @Column({
    name: "notification_quiet_hours_end",
    type: "time",
    nullable: true,
  })
  notificationQuietHoursEnd: string;

  // Default Settings for New Turfs
  @Column({ name: "default_auto_confirm", type: "boolean", default: false })
  defaultAutoConfirm: boolean;

  @Column({ name: "default_advance_booking_days", type: "int", default: 7 })
  defaultAdvanceBookingDays: number;

  @Column({ name: "default_cancellation_deadline", type: "int", default: 24 })
  defaultCancellationDeadline: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
