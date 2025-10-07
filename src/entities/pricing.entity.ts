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

export enum TimeSlot {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
}

@Entity("pricing")
@Index(["turfId"])
@Unique(["turfId", "dayType", "timeSlot"])
export class Pricing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid" })
  turfId: string;

  @Column({
    name: "day_type",
    type: "enum",
    enum: DayType,
  })
  dayType: DayType;

  @Column({
    name: "time_slot",
    type: "enum",
    enum: TimeSlot,
  })
  timeSlot: TimeSlot;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value, // store as-is
      from: (value: string) => parseFloat(value), // retrieve as number
    },
  })
  price: number;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => Turf, (turf) => turf.pricing, { eager: false })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;
}
