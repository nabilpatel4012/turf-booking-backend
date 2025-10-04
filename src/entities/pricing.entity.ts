import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
} from "typeorm";

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
@Unique(["dayType", "timeSlot"])
export class Pricing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

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

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
