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
import { Admin } from "./admin.entity";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  userId: string | null;

  @Column({ type: "uuid", nullable: true })
  @Index()
  adminId: string | null;

  @Column({ type: "varchar" })
  refreshToken: string;

  @Column({ type: "varchar" })
  deviceName: string;

  @Column({ type: "varchar" })
  deviceType: string; // mobile, desktop, tablet

  @Column({ type: "varchar", nullable: true })
  browser: string;

  @Column({ type: "varchar", nullable: true })
  os: string;

  @Column({ type: "varchar" })
  ipAddress: string;

  @Column({ type: "varchar", nullable: true })
  userAgent: string;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Admin, (admin) => admin.sessions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "adminId" })
  admin: Admin;
}
