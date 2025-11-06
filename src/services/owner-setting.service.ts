import { Repository } from "typeorm";
import { OwnerSetting } from "../entities/owner-setting.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

interface OwnerSettingUpdate {
  // Security
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string;
  sessionTimeoutMinutes?: number;

  // Notification Preferences
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  whatsappNotifications?: boolean;

  // Notification Types
  notifyNewBooking?: boolean;
  notifyCancellation?: boolean;
  notifyPaymentReceived?: boolean;
  notifyPaymentFailed?: boolean;
  notifyRefund?: boolean;
  dailySummary?: boolean;
  weeklyReport?: boolean;

  // Communication
  preferredLanguage?: string;
  notificationQuietHoursStart?: string;
  notificationQuietHoursEnd?: string;

  // Defaults for new turfs
  defaultAutoConfirm?: boolean;
  defaultAdvanceBookingDays?: number;
  defaultCancellationDeadline?: number;
}

export class OwnerSettingService {
  private ownerSettingRepository: Repository<OwnerSetting>;

  constructor() {
    this.ownerSettingRepository = AppDataSource.getRepository(OwnerSetting);
  }

  // Get owner settings (create if not exists)
  async getOwnerSettings(ownerId: string): Promise<OwnerSetting> {
    let settings = await this.ownerSettingRepository.findOne({
      where: { ownerId },
    });

    if (!settings) {
      settings = await this.createDefaultOwnerSettings(ownerId);
    }

    return settings;
  }

  // Create default settings for a new owner
  async createDefaultOwnerSettings(ownerId: string): Promise<OwnerSetting> {
    const settings = this.ownerSettingRepository.create({
      ownerId,
      // All defaults are set in entity
    });

    return await this.ownerSettingRepository.save(settings);
  }

  // Update owner settings
  async updateOwnerSettings(
    ownerId: string,
    updates: OwnerSettingUpdate
  ): Promise<OwnerSetting> {
    let settings = await this.getOwnerSettings(ownerId);

    // Validate 2FA method if enabled
    if (updates.twoFactorEnabled && updates.twoFactorMethod) {
      const validMethods = ["sms", "email", "authenticator"];
      if (!validMethods.includes(updates.twoFactorMethod)) {
        throw new AppError(
          "Invalid 2FA method. Must be: sms, email, or authenticator",
          400
        );
      }
    }

    // Validate language
    if (updates.preferredLanguage) {
      const validLanguages = ["en", "hi", "mr", "ta", "te", "kn"];
      if (!validLanguages.includes(updates.preferredLanguage)) {
        throw new AppError("Invalid language code", 400);
      }
    }

    // Update fields
    Object.assign(settings, updates);

    return await this.ownerSettingRepository.save(settings);
  }

  // Enable 2FA
  async enable2FA(
    ownerId: string,
    method: "sms" | "email" | "authenticator"
  ): Promise<OwnerSetting> {
    const settings = await this.getOwnerSettings(ownerId);

    settings.twoFactorEnabled = true;
    settings.twoFactorMethod = method;

    return await this.ownerSettingRepository.save(settings);
  }

  // Disable 2FA
  async disable2FA(ownerId: string): Promise<OwnerSetting> {
    const settings = await this.getOwnerSettings(ownerId);

    settings.twoFactorEnabled = false;
    settings.twoFactorMethod = "";

    return await this.ownerSettingRepository.save(settings);
  }

  // Check if owner should receive notification
  async shouldNotify(
    ownerId: string,
    notificationType: "booking" | "cancellation" | "payment" | "refund"
  ): Promise<boolean> {
    const settings = await this.getOwnerSettings(ownerId);

    // Check quiet hours if set
    if (
      settings.notificationQuietHoursStart &&
      settings.notificationQuietHoursEnd
    ) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = settings.notificationQuietHoursStart
        .split(":")
        .map(Number);
      const [endHour, endMin] = settings.notificationQuietHoursEnd
        .split(":")
        .map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (currentTime >= startTime && currentTime <= endTime) {
        return false; // In quiet hours
      }
    }

    // Check specific notification type
    switch (notificationType) {
      case "booking":
        return settings.notifyNewBooking;
      case "cancellation":
        return settings.notifyCancellation;
      case "payment":
        return settings.notifyPaymentReceived;
      case "refund":
        return settings.notifyRefund;
      default:
        return true;
    }
  }

  // Get notification channels enabled for owner
  async getEnabledNotificationChannels(ownerId: string): Promise<string[]> {
    const settings = await this.getOwnerSettings(ownerId);
    const channels: string[] = [];

    if (settings.emailNotifications) channels.push("email");
    if (settings.smsNotifications) channels.push("sms");
    if (settings.pushNotifications) channels.push("push");
    if (settings.whatsappNotifications) channels.push("whatsapp");

    return channels;
  }

  // Get settings by category
  async getOwnerSettingsByCategory(ownerId: string) {
    const settings = await this.getOwnerSettings(ownerId);

    return {
      security: {
        twoFactorEnabled: settings.twoFactorEnabled,
        twoFactorMethod: settings.twoFactorMethod,
        sessionTimeout: settings.sessionTimeoutMinutes,
      },
      notificationChannels: {
        email: settings.emailNotifications,
        sms: settings.smsNotifications,
        push: settings.pushNotifications,
        whatsapp: settings.whatsappNotifications,
      },
      notificationTypes: {
        newBooking: settings.notifyNewBooking,
        cancellation: settings.notifyCancellation,
        paymentReceived: settings.notifyPaymentReceived,
        paymentFailed: settings.notifyPaymentFailed,
        refund: settings.notifyRefund,
        dailySummary: settings.dailySummary,
        weeklyReport: settings.weeklyReport,
      },
      communication: {
        preferredLanguage: settings.preferredLanguage,
        quietHoursStart: settings.notificationQuietHoursStart,
        quietHoursEnd: settings.notificationQuietHoursEnd,
      },
      defaultsForNewTurfs: {
        autoConfirm: settings.defaultAutoConfirm,
        advanceBookingDays: settings.defaultAdvanceBookingDays,
        cancellationDeadline: settings.defaultCancellationDeadline,
      },
      metadata: {
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    };
  }

  // Delete owner settings
  async deleteOwnerSettings(ownerId: string): Promise<void> {
    await this.ownerSettingRepository.delete({ ownerId });
  }
}
