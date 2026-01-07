import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";
import { Review } from "./review.entity";

@Entity("review_reports")
export class ReviewReport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "review_id", type: "uuid" })
  @Index()
  reviewId: string;

  @Column({ name: "user_id", type: "uuid" }) // Reporter
  userId: string;

  @Column({ type: "text" })
  reason: string;

  @Column({ type: "varchar", default: "pending" }) // pending, resolved, dismissed
  status: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => Review, { onDelete: "CASCADE" })
  @JoinColumn({ name: "review_id" })
  review: Review;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;
}
