import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./user.entity";
import { Booking } from "./booking.entity";

@Entity("reviews")
@Index(["bookingId"])
@Unique(["userId", "bookingId"])
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "booking_id", type: "uuid" })
  bookingId: string;

  @Column({ type: "smallint" })
  rating: number;

  @Column({ type: "text", nullable: true })
  comment: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.reviews, { eager: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Booking, { eager: false })
  @JoinColumn({ name: "booking_id" })
  booking: Booking;
}
