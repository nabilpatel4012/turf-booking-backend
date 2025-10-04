import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { Admin } from "./admin.entity";
import { Booking } from "./booking.entity";
import { Review } from "./review.entity";
import { Pricing } from "./pricing.entity";

export enum TurfStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
}

@Entity("turfs")
@Index(["status"])
@Index(["ownerId"])
export class Turf {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "owner_id", type: "uuid" })
  ownerId: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar" })
  address: string;

  @Column({ type: "varchar", nullable: true })
  city: string;

  @Column({ type: "varchar", nullable: true })
  state: string;

  @Column({ type: "varchar", nullable: true })
  zipCode: string;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: "varchar", nullable: true })
  phone: string;

  @Column({ type: "simple-array", nullable: true })
  images: string[];

  @Column({ type: "simple-array", nullable: true })
  amenities: string[];

  @Column({
    type: "enum",
    enum: TurfStatus,
    default: TurfStatus.ACTIVE,
  })
  status: TurfStatus;

  @Column({ name: "opening_time", type: "time", default: "06:00:00" })
  openingTime: string;

  @Column({ name: "closing_time", type: "time", default: "23:00:00" })
  closingTime: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => Admin, (admin) => admin.turfs, { eager: false })
  @JoinColumn({ name: "owner_id" })
  owner: Admin;

  @OneToMany(() => Booking, (booking) => booking.turf)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.turf)
  reviews: Review[];

  @OneToMany(() => Pricing, (pricing) => pricing.turf)
  pricing: Pricing[];
}
