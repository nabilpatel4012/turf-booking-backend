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
import { User } from "./user.entity";
import { Turf } from "./turf.entity";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  ACTIVE = "active",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity("bookings")
@Index(["turfId", "date", "startTime", "endTime"])
@Index(["status", "date"])
@Index(["userId"])
export class Booking {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid" })
  turfId: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "date" })
  date: string;

  @Column({ name: "start_time", type: "timestamp" })
  startTime: Date;

  @Column({ name: "end_time", type: "timestamp" })
  endTime: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({
    type: "enum",
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string;

  @Column({ name: "cancelled_at", type: "timestamp", nullable: true })
  cancelledAt: Date;

  @Column({ name: "cancellation_reason", type: "text", nullable: true })
  cancellationReason: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.bookings, { eager: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Turf, (turf) => turf.bookings, { eager: false })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;
}
