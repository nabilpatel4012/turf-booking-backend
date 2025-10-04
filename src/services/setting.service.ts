import { Repository } from "typeorm";
import { Setting } from "../entities/setting.entity";
import { AppDataSource } from "../db/data.source";

export class SettingService {
  private settingRepository: Repository<Setting>;

  constructor() {
    this.settingRepository = AppDataSource.getRepository(Setting);
  }

  async getAllSettings() {
    const settings = await this.settingRepository.find();

    const formatted: any = {};
    settings.forEach((setting) => {
      formatted[setting.key] =
        setting.key === "booking_disabled"
          ? setting.value === "true"
          : setting.value;
    });

    return formatted;
  }

  async updateBookingStatus(disabled: boolean, reason?: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        Setting,
        { key: "booking_disabled" },
        { value: String(disabled) }
      );

      await queryRunner.manager.update(
        Setting,
        { key: "disabled_reason" },
        { value: reason || "" }
      );

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

  async isBookingDisabled(): Promise<{ disabled: boolean; reason: string }> {
    const [disabledSetting, reasonSetting] = await Promise.all([
      this.settingRepository.findOne({ where: { key: "booking_disabled" } }),
      this.settingRepository.findOne({ where: { key: "disabled_reason" } }),
    ]);

    return {
      disabled: disabledSetting?.value === "true",
      reason: reasonSetting?.value || "",
    };
  }
}
