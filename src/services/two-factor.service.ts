import { Repository } from "typeorm";
import * as speakeasy from "speakeasy";
import * as qrcode from "qrcode";
import * as crypto from "crypto";
import { TwoFactorAuth } from "../entities/two-factor.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

export class TwoFactorService {
  private twoFactorRepository: Repository<TwoFactorAuth>;
  private encryptionKey: string;

  constructor() {
    this.twoFactorRepository = AppDataSource.getRepository(TwoFactorAuth);
    // Use environment variable for encryption key
    this.encryptionKey =
      process.env.ENCRYPTION_KEY || "your-32-char-secret-key-here!!!";

    if (this.encryptionKey.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be exactly 32 characters");
    }
  }

  // Encrypt sensitive data
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  // Decrypt sensitive data
  private decrypt(text: string): string {
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift()!, "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Generate backup codes
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Setup 2FA - Generate secret and QR code
  async setup2FA(
    userId: string,
    userEmail: string,
    appName: string = "TurfBooking"
  ): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    // Check if 2FA already exists
    const existing = await this.twoFactorRepository.findOne({
      where: { userId },
    });

    if (existing && existing.isEnabled) {
      throw new AppError(
        "2FA is already enabled. Disable it first to set up again.",
        400
      );
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${appName} (${userEmail})`,
      length: 32,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    if (existing) {
      existing.secret = this.encrypt(secret.base32);
      existing.backupCodes = this.encrypt(JSON.stringify(backupCodes));
      existing.isEnabled = false;
      existing.verifiedAt = null;
      await this.twoFactorRepository.save(existing);
    } else {
      const twoFactor = this.twoFactorRepository.create({
        userId,
        secret: this.encrypt(secret.base32),
        backupCodes: this.encrypt(JSON.stringify(backupCodes)),
        isEnabled: false,
      });
      await this.twoFactorRepository.save(twoFactor);
    }

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  // Verify and enable 2FA
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });

    if (!twoFactor) {
      throw new AppError("2FA not set up", 404);
    }

    if (twoFactor.isEnabled) {
      throw new AppError("2FA is already enabled", 400);
    }

    const secret = this.decrypt(twoFactor.secret);

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2, // Allow 2 time steps before and after (60 seconds)
    });

    if (!verified) {
      throw new AppError("Invalid verification code", 400);
    }

    // Enable 2FA
    twoFactor.isEnabled = true;
    twoFactor.verifiedAt = new Date();
    await this.twoFactorRepository.save(twoFactor);

    return true;
  }

  // Validate 2FA token during login
  async validateToken(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new AppError("2FA not enabled", 404);
    }

    const secret = this.decrypt(twoFactor.secret);

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1, // Allow 1 time step before and after (30 seconds)
    });

    if (verified) {
      // Update last used time
      twoFactor.lastUsedAt = new Date();
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    return false;
  }

  // Validate backup code
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new AppError("2FA not enabled", 404);
    }

    const backupCodesJson = this.decrypt(twoFactor.backupCodes);
    let backupCodes: string[] = JSON.parse(backupCodesJson);

    const codeIndex = backupCodes.indexOf(code.toUpperCase());

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    backupCodes.splice(codeIndex, 1);

    // Update backup codes
    twoFactor.backupCodes = this.encrypt(JSON.stringify(backupCodes));
    twoFactor.lastUsedAt = new Date();
    await this.twoFactorRepository.save(twoFactor);

    return true;
  }

  // Disable 2FA
  async disable2FA(userId: string, password: string): Promise<boolean> {
    // Note: You should verify the user's password before disabling 2FA
    // This is just marking it as disabled, password verification should be done in controller

    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new AppError("2FA is not enabled", 404);
    }

    twoFactor.isEnabled = false;
    await this.twoFactorRepository.save(twoFactor);

    return true;
  }

  // Check if 2FA is enabled for user
  async is2FAEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId, isEnabled: true },
    });

    return !!twoFactor;
  }

  // Get 2FA status
  async get2FAStatus(userId: string): Promise<{
    enabled: boolean;
    verifiedAt: Date | null;
    lastUsedAt: Date | null;
    backupCodesRemaining: number;
  }> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });

    if (!twoFactor) {
      return {
        enabled: false,
        verifiedAt: null,
        lastUsedAt: null,
        backupCodesRemaining: 0,
      };
    }

    let backupCodesRemaining = 0;
    if (twoFactor.isEnabled) {
      const backupCodesJson = this.decrypt(twoFactor.backupCodes);
      const backupCodes: string[] = JSON.parse(backupCodesJson);
      backupCodesRemaining = backupCodes.length;
    }

    return {
      enabled: twoFactor.isEnabled,
      verifiedAt: twoFactor.verifiedAt,
      lastUsedAt: twoFactor.lastUsedAt,
      backupCodesRemaining,
    };
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new AppError("2FA not enabled", 404);
    }

    const backupCodes = this.generateBackupCodes();
    twoFactor.backupCodes = this.encrypt(JSON.stringify(backupCodes));
    await this.twoFactorRepository.save(twoFactor);

    return backupCodes;
  }

  // Delete 2FA data (for account deletion)
  async delete2FA(userId: string): Promise<void> {
    await this.twoFactorRepository.delete({ userId });
  }
}
