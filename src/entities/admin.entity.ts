import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Turf } from "./turf.entity";

@Entity("admins")
export class Admin {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, type: "varchar", length: 140 })
  email: string;

  @Column({ type: "varchar", select: false })
  password: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  phone: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => Turf, (turf) => turf.owner)
  turfs: Turf[];
}
