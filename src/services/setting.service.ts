import { Repository } from "typeorm";
import { Setting } from "../entities/setting.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

export class SettingService {
  private settingRepository: Repository<Setting>;
  private turfRepository: Repository<Turf>;

  constructor() {
    this.settingRepository = AppDataSource.getRepository(Setting);
    this.turfRepository = AppDataSource.getRepository(Turf);
  }

  async getAllSettings(turfId: string) {
    const settings = await this.settingRepository.find({
      where: { turfId },
    });

    const formatted: any = {};
    settings.forEach((setting) => {
      formatted[setting.key] =
        setting.key === "booking_disabled"
          ? setting.value === "true"
          : setting.value;
    });

    return formatted;
  }

  async getSetting(turfId: string, key: string) {
    const setting = await this.settingRepository.findOne({
      where: { turfId, key },
    });

    if (!setting) {
      return null;
    }

    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
    };
  }

  async updateSetting(
    turfId: string,
    ownerId: string,
    key: string,
    value: string,
    description?: string
  ) {
    // Verify ownership
    const turf = await this.turfRepository.findOne({
      where: { id: turfId, ownerId },
    });

    if (!turf) {
      throw new AppError("Turf not found or unauthorized", 404);
    }

    // Check if setting exists
    let setting = await this.settingRepository.findOne({
      where: { turfId, key },
    });

    if (setting) {
      // Update existing setting
      setting.value = value;
      if (description) {
        setting.description = description;
      }
    } else {
      // Create new setting
      setting = this.settingRepository.create({
        turfId,
        key,
        value,
        description,
      });
    }

    await this.settingRepository.save(setting);

    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
    };
  }

  async updateBookingStatus(
    turfId: string,
    ownerId: string,
    disabled: boolean,
    reason?: string
  ) {
    // Verify ownership
    const turf = await this.turfRepository.findOne({
      where: { id: turfId, ownerId },
    });

    if (!turf) {
      throw new AppError("Turf not found or unauthorized", 404);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update or create booking_disabled setting
      const disabledSetting = await queryRunner.manager.findOne(Setting, {
        where: { turfId, key: "booking_disabled" },
      });

      if (disabledSetting) {
        await queryRunner.manager.update(
          Setting,
          { turfId, key: "booking_disabled" },
          { value: String(disabled) }
        );
      } else {
        const newSetting = queryRunner.manager.create(Setting, {
          turfId,
          key: "booking_disabled",
          value: String(disabled),
          description: "Whether bookings are disabled for this turf",
        });
        await queryRunner.manager.save(newSetting);
      }

      // Update or create disabled_reason setting
      const reasonSetting = await queryRunner.manager.findOne(Setting, {
        where: { turfId, key: "disabled_reason" },
      });

      if (reasonSetting) {
        await queryRunner.manager.update(
          Setting,
          { turfId, key: "disabled_reason" },
          { value: reason || "" }
        );
      } else {
        const newSetting = queryRunner.manager.create(Setting, {
          turfId,
          key: "disabled_reason",
          value: reason || "",
          description: "Reason for disabling bookings",
        });
        await queryRunner.manager.save(newSetting);
      }

      await queryRunner.commitTransaction();

      return {
        bookingDisabled: disabled,
        disabledReason: reason || "",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async isBookingDisabled(
    turfId: string
  ): Promise<{ disabled: boolean; reason: string }> {
    const [disabledSetting, reasonSetting] = await Promise.all([
      this.settingRepository.findOne({
        where: { turfId, key: "booking_disabled" },
      }),
      this.settingRepository.findOne({
        where: { turfId, key: "disabled_reason" },
      }),
    ]);

    return {
      disabled: disabledSetting?.value === "true",
      reason: reasonSetting?.value || "",
    };
  }

  async createDefaultSettings(turfId: string) {
    const defaultSettings = [
      {
        key: "booking_disabled",
        value: "false",
        description: "Whether bookings are disabled for this turf",
      },
      {
        key: "disabled_reason",
        value: "",
        description: "Reason for disabling bookings",
      },
      {
        key: "max_booking_hours",
        value: "3",
        description: "Maximum hours allowed per booking",
      },
      {
        key: "advance_booking_days",
        value: "7",
        description: "How many days in advance bookings are allowed",
      },
      {
        key: "cancellation_deadline_hours",
        value: "24",
        description: "Minimum hours before booking start time for cancellation",
      },
    ];

    const settingEntities = defaultSettings.map((s) =>
      this.settingRepository.create({ ...s, turfId })
    );

    await this.settingRepository.save(settingEntities);

    return await this.getAllSettings(turfId);
  }

  async deleteSettingsForTurf(turfId: string) {
    await this.settingRepository.delete({ turfId });
  }

  async bulkUpdateSettings(
    turfId: string,
    ownerId: string,
    settings: { key: string; value: string; description?: string }[]
  ) {
    // Verify ownership
    const turf = await this.turfRepository.findOne({
      where: { id: turfId, ownerId },
    });

    if (!turf) {
      throw new AppError("Turf not found or unauthorized", 404);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const { key, value, description } of settings) {
        const existing = await queryRunner.manager.findOne(Setting, {
          where: { turfId, key },
        });

        if (existing) {
          await queryRunner.manager.update(
            Setting,
            { turfId, key },
            { value, ...(description && { description }) }
          );
        } else {
          const newSetting = queryRunner.manager.create(Setting, {
            turfId,
            key,
            value,
            description,
          });
          await queryRunner.manager.save(newSetting);
        }
      }

      await queryRunner.commitTransaction();

      return await this.getAllSettings(turfId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
