import { Repository } from "typeorm";
import { TurfSetting } from "../entities/turf-setting.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

interface TurfSettingUpdate {
  // Booking Settings
  bookingEnabled?: boolean;
  bookingDisabledReason?: string;
  autoConfirmBooking?: boolean;
  maxBookingHours?: number;
  advanceBookingDays?: number;
  minBookingHours?: number;
  cancellationDeadlineHours?: number;
  bufferTimeMinutes?: number;

  // Notification Settings
  notifyOnNewBooking?: boolean;
  notifyOnCancellation?: boolean;
  notifyOnPayment?: boolean;
  reminderBeforeHours?: number;

  // Payment Settings
  requireAdvancePayment?: boolean;
  advancePaymentAmount?: number;
  refundEnabled?: boolean;
  refundPercentage?: number;

  // General Settings
  timezone?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

export class TurfSettingService {
  private turfSettingRepository: Repository<TurfSetting>;
  private turfRepository: Repository<Turf>;

  constructor() {
    this.turfSettingRepository = AppDataSource.getRepository(TurfSetting);
    this.turfRepository = AppDataSource.getRepository(Turf);
  }

  // Get settings for a turf (create if not exists)
  async getTurfSettings(turfId: string): Promise<TurfSetting> {
    let settings = await this.turfSettingRepository.findOne({
      where: { turfId },
    });

    if (!settings) {
      settings = await this.createDefaultTurfSettings(turfId);
    }

    return settings;
  }

  // Create default settings for a new turf
  async createDefaultTurfSettings(turfId: string): Promise<TurfSetting> {
    const turf = await this.turfRepository.findOne({ where: { id: turfId } });
    if (!turf) {
      throw new AppError("Turf not found", 404);
    }

    const settings = this.turfSettingRepository.create({
      turfId,
      // All defaults are set in entity
    });

    return await this.turfSettingRepository.save(settings);
  }

  // Update turf settings (with ownership verification)
  async updateTurfSettings(
    turfId: string,
    ownerId: string,
    updates: TurfSettingUpdate
  ): Promise<TurfSetting> {
    // Verify ownership
    const turf = await this.turfRepository.findOne({
      where: { id: turfId, ownerId },
    });

    if (!turf) {
      throw new AppError("Turf not found or unauthorized", 404);
    }

    let settings = await this.getTurfSettings(turfId);

    // Validate amount fields
    if (updates.advancePaymentAmount !== undefined) {
      if (updates.advancePaymentAmount < 0) {
        throw new AppError(
          "Advance payment amount must be non-negative",
          400
        );
      }
    }

    if (updates.refundPercentage !== undefined) {
      if (updates.refundPercentage < 0 || updates.refundPercentage > 100) {
        throw new AppError("Refund percentage must be between 0 and 100", 400);
      }
    }

    // Update fields
    Object.assign(settings, updates);

    return await this.turfSettingRepository.save(settings);
  }

  // Check if booking is allowed
  async isBookingAllowed(turfId: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const settings = await this.getTurfSettings(turfId);

    if (settings.maintenanceMode) {
      return {
        allowed: false,
        reason: settings.maintenanceMessage || "Turf is under maintenance",
      };
    }

    if (!settings.bookingEnabled) {
      return {
        allowed: false,
        reason:
          settings.bookingDisabledReason || "Bookings are currently disabled",
      };
    }

    return { allowed: true };
  }

  // Delete settings when turf is deleted
  async deleteTurfSettings(turfId: string): Promise<void> {
    await this.turfSettingRepository.delete({ turfId });
  }

  // Get settings by category for easier frontend display
  async getTurfSettingsByCategory(turfId: string) {
    const settings = await this.getTurfSettings(turfId);

    return {
      booking: {
        enabled: settings.bookingEnabled,
        disabledReason: settings.bookingDisabledReason,
        autoConfirm: settings.autoConfirmBooking,
        maxHours: settings.maxBookingHours,
        minHours: settings.minBookingHours,
        advanceDays: settings.advanceBookingDays,
        cancellationDeadline: settings.cancellationDeadlineHours,
        bufferTime: settings.bufferTimeMinutes,
      },
      notifications: {
        onNewBooking: settings.notifyOnNewBooking,
        onCancellation: settings.notifyOnCancellation,
        onPayment: settings.notifyOnPayment,
        reminderBefore: settings.reminderBeforeHours,
      },
      payment: {
        requireAdvance: settings.requireAdvancePayment,
        advanceAmount: settings.advancePaymentAmount,
        refundEnabled: settings.refundEnabled,
        refundPercentage: settings.refundPercentage,
      },
      general: {
        timezone: settings.timezone,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
      metadata: {
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    };
  }
}
