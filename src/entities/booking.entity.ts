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

export enum BookingStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity("bookings")
@Index(["date", "startTime", "endTime"])
@Index(["status", "date"])
export class Booking {
  @PrimaryGeneratedColumn("uuid")
  id: string;

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
    default: BookingStatus.ACTIVE,
  })
  status: BookingStatus;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string;

  @Column({ name: "cancelled_at", type: "timestamp", nullable: true })
  cancelledAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.bookings, { eager: false })
  @JoinColumn({ name: "user_id" })
  user: User;
}
