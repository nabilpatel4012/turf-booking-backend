import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Turf } from "./turf.entity";

export enum AnnouncementType {
  GENERAL = "general",
  MAINTENANCE = "maintenance",
  PROMOTION = "promotion",
  CLOSURE = "closure",
}

@Entity("announcements")
@Index(["turfId"])
@Index(["isActive", "createdAt"])
export class Announcement {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid", nullable: true })
  turfId: string;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "enum",
    enum: AnnouncementType,
    default: AnnouncementType.GENERAL,
  })
  type: AnnouncementType;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "expires_at", type: "timestamp", nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => Turf, { eager: false, nullable: true })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;
}
