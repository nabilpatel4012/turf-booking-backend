import { Response } from "express";
import { SettingService } from "../services/setting.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AuthRole } from "../services/auth.service";

export class SettingController {
  private settingService: SettingService;

  constructor() {
    this.settingService = new SettingService();
  }

  // Get all settings for a turf (Public - accessible by users)
  getSettings = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.query;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const settings = await this.settingService.getAllSettings(turfId as string);

    res.json({
      success: true,
      turfId,
      data: settings,
    });
  };

  // Get specific setting for a turf
  getSetting = async (req: AuthRequest, res: Response) => {
    const { turfId, key } = req.query;

    if (!turfId || !key) {
      return res.status(400).json({ error: "Turf ID and key are required" });
    }

    const setting = await this.settingService.getSetting(
      turfId as string,
      key as string
    );

    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }

    res.json({
      success: true,
      data: setting,
    });
  };

  // Update single setting (Admin only - must be owner)
  updateSetting = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { turfId, key, value, description } = req.body;

    if (!turfId || !key || value === undefined) {
      return res.status(400).json({
        error: "Turf ID, key, and value are required",
      });
    }

    const setting = await this.settingService.updateSetting(
      turfId,
      adminId,
      key,
      value,
      description
    );

    res.json({
      success: true,
      message: "Setting updated successfully",
      data: setting,
    });
  };

  // Update booking status for turf (Admin only - must be owner)
  updateBookingStatus = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { turfId, disabled, reason } = req.body;

    if (!turfId || disabled === undefined) {
      return res.status(400).json({
        error: "Turf ID and disabled status are required",
      });
    }

    const result = await this.settingService.updateBookingStatus(
      turfId,
      adminId,
      disabled,
      reason
    );

    res.json({
      success: true,
      message: "Booking status updated successfully",
      data: result,
    });
  };

  // Bulk update settings (Admin only - must be owner)
  bulkUpdateSettings = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { turfId, settings } = req.body;

    if (!turfId || !settings || !Array.isArray(settings)) {
      return res.status(400).json({
        error: "Turf ID and settings array are required",
      });
    }

    const result = await this.settingService.bulkUpdateSettings(
      turfId,
      adminId,
      settings
    );

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: result,
    });
  };

  // Create default settings (Admin only)
  createDefaultSettings = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.body;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const settings = await this.settingService.createDefaultSettings(turfId);

    res.status(201).json({
      success: true,
      message: "Default settings created successfully",
      data: settings,
    });
  };
}
