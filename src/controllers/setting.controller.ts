import { Response } from "express";
import { SettingService } from "../services/setting.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class SettingController {
  private settingService: SettingService;

  constructor() {
    this.settingService = new SettingService();
  }

  getSettings = async (req: AuthRequest, res: Response) => {
    const settings = await this.settingService.getAllSettings();
    res.json(settings);
  };

  updateBookingStatus = async (req: AuthRequest, res: Response) => {
    const { disabled, reason } = req.body;
    const result = await this.settingService.updateBookingStatus(
      disabled,
      reason
    );
    res.json({ message: "Settings updated", ...result });
  };
}
