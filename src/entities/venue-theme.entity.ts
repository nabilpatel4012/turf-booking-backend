import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Turf } from "./turf.entity";

export enum ThemePreset {
  MODERN = "modern",
  CLASSIC = "classic",
  VIBRANT = "vibrant",
  DARK = "dark",
  MINIMAL = "minimal",
}

@Entity("venue_themes")
export class VenueTheme {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "turf_id", type: "uuid" })
  turfId: string;

  @Column({
    type: "enum",
    enum: ThemePreset,
    default: ThemePreset.MODERN,
  })
  preset: ThemePreset;

  @Column({ name: "primary_color", type: "varchar", length: 7, default: "#0f172a" })
  primaryColor: string;

  @Column({ name: "secondary_color", type: "varchar", length: 7, default: "#3b82f6" })
  secondaryColor: string;

  @Column({ name: "background_color", type: "varchar", length: 7, default: "#ffffff" })
  backgroundColor: string;

  @Column({ type: "varchar", nullable: true })
  layout: string;

  @Column({ type: "varchar", nullable: true })
  font: string;

  @OneToOne(() => Turf, (turf) => turf.theme, { onDelete: "CASCADE" })
  @JoinColumn({ name: "turf_id" })
  turf: Turf;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
