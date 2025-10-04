import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Turf } from "./turf.entity";

@Entity("settings")
@Index(["turfId"])
@Unique(["turfId", "key"])
export class Setting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid" })
  turfId: string;

  @Column({ type: "varchar" })
  key: string;

  @Column({ type: "text" })
  value: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => Turf, { eager: false })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;
}
