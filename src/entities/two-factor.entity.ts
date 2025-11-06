import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("two_factor_auth")
@Index(["userId"])
export class TwoFactorAuth {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", unique: true })
  userId: string;

  @Column({ name: "secret", type: "varchar" })
  secret: string; // Encrypted TOTP secret

  @Column({ name: "backup_codes", type: "text" })
  backupCodes: string; // JSON array of encrypted backup codes

  @Column({ name: "is_enabled", type: "boolean", default: false })
  isEnabled: boolean;

  @Column({ name: "verified_at", type: "timestamp", nullable: true })
  verifiedAt: Date | null;

  @Column({ name: "last_used_at", type: "timestamp", nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
