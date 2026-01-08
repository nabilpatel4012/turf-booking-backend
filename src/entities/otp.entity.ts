import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("otp_tokens")
@Index(["email", "isUsed"])
export class OTPToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 140 })
  email: string;

  @Column({ type: "varchar", length: 6 })
  otp: string;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "is_used", type: "boolean", default: false })
  isUsed: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
