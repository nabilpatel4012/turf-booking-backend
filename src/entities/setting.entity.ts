import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from "typeorm";

@Entity("settings")
export class Setting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, type: "varchar" })
  key: string;

  @Column({ type: "text" })
  value: string;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
