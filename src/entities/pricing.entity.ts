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

export enum DayType {
  WEEKDAY = "weekday",
  WEEKEND = "weekend",
}



@Entity("pricing")
@Index(["turfId"])
@Index(["turfId", "specificDate"])
export class Pricing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid" })
  turfId: string;

  @Column({
    name: "day_type",
    type: "enum",
    enum: DayType,
    nullable: true, // Nullable because specificDate might take precedence
  })
  dayType: DayType;

  @Column({ name: "specific_date", type: "date", nullable: true })
  specificDate: Date;

  @Column({ name: "start_time", type: "time" })
  startTime: string; // Format "HH:mm:ss"

  @Column({ name: "end_time", type: "time" })
  endTime: string; // Format "HH:mm:ss"

  @Column({ type: "int", default: 0 })
  priority: number; // Higher number = higher priority

  @Column({ type: "varchar", length: 50, nullable: true })
  name: string; // e.g., "Morning Rush", "Diwali Special"

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price: number;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => Turf, (turf) => turf.pricing, { eager: false })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;
}
