// import { Response } from "express";
// import { TurfSettingService } from "../services/turf-setting.service";
// import { OwnerSettingService } from "../services/owner-setting.service";
// import { AuthRequest } from "../middleware/auth.middleware";

// export class SettingController {
//   private turfSettingService: TurfSettingService;
//   private ownerSettingService: OwnerSettingService;

//   constructor() {
//     this.turfSettingService = new TurfSettingService();
//     this.ownerSettingService = new OwnerSettingService();
//   }

//   getTurfSettings = async (req: AuthRequest, res: Response) => {
//     const { turfId } = req.query;

//     if (!turfId) {
//       return res.status(400).json({ error: "Turf ID is required" });
//     }

//     const settings = await this.turfSettingService.getTurfSettingsByCategory(
//       turfId as string
//     );

//     res.json({
//       success: true,
//       data: settings,
//     });
//   };

//   updateTurfSettings = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;
//     const { turfId, ...updates } = req.body;

//     if (!turfId) {
//       return res.status(400).json({ error: "Turf ID is required" });
//     }

//     const settings = await this.turfSettingService.updateTurfSettings(
//       turfId,
//       ownerId,
//       updates
//     );

//     res.json({
//       success: true,
//       message: "Turf settings updated successfully",
//       data: settings,
//     });
//   };

//   toggleBookingStatus = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;
//     const { turfId, enabled, reason } = req.body;

//     if (!turfId || enabled === undefined) {
//       return res.status(400).json({
//         error: "Turf ID and enabled status are required",
//       });
//     }

//     const settings = await this.turfSettingService.updateTurfSettings(
//       turfId,
//       ownerId,
//       {
//         bookingEnabled: enabled,
//         bookingDisabledReason: reason,
//       }
//     );

//     res.json({
//       success: true,
//       message: `Bookings ${enabled ? "enabled" : "disabled"} successfully`,
//       data: {
//         bookingEnabled: settings.bookingEnabled,
//         bookingDisabledReason: settings.bookingDisabledReason,
//       },
//     });
//   };

//   toggleMaintenanceMode = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;
//     const { turfId, enabled, message } = req.body;

//     if (!turfId || enabled === undefined) {
//       return res.status(400).json({
//         error: "Turf ID and enabled status are required",
//       });
//     }

//     const settings = await this.turfSettingService.updateTurfSettings(
//       turfId,
//       ownerId,
//       {
//         maintenanceMode: enabled,
//         maintenanceMessage: message,
//       }
//     );

//     res.json({
//       success: true,
//       message: `Maintenance mode ${
//         enabled ? "enabled" : "disabled"
//       } successfully`,
//       data: {
//         maintenanceMode: settings.maintenanceMode,
//         maintenanceMessage: settings.maintenanceMessage,
//       },
//     });
//   };

//   checkBookingAllowed = async (req: AuthRequest, res: Response) => {
//     const { turfId } = req.query;

//     if (!turfId) {
//       return res.status(400).json({ error: "Turf ID is required" });
//     }

//     const result = await this.turfSettingService.isBookingAllowed(
//       turfId as string
//     );

//     res.json({
//       success: true,
//       data: result,
//     });
//   };

//   getOwnerSettings = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;

//     const settings = await this.ownerSettingService.getOwnerSettingsByCategory(
//       ownerId
//     );

//     res.json({
//       success: true,
//       data: settings,
//     });
//   };

//   updateOwnerSettings = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;
//     const updates = req.body;

//     const settings = await this.ownerSettingService.updateOwnerSettings(
//       ownerId,
//       updates
//     );

//     res.json({
//       success: true,
//       message: "Owner settings updated successfully",
//       data: settings,
//     });
//   };

//   // Enable 2FA
//   enable2FA = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;
//     const { method } = req.body;

//     if (!method) {
//       return res.status(400).json({ error: "2FA method is required" });
//     }

//     if (!["sms", "email", "authenticator"].includes(method)) {
//       return res.status(400).json({
//         error: "Invalid 2FA method. Must be: sms, email, or authenticator",
//       });
//     }

//     const settings = await this.ownerSettingService.enable2FA(ownerId, method);

//     res.json({
//       success: true,
//       message: "Two-factor authentication enabled successfully",
//       data: {
//         twoFactorEnabled: settings.twoFactorEnabled,
//         twoFactorMethod: settings.twoFactorMethod,
//       },
//     });
//   };

//   // Disable 2FA
//   disable2FA = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;

//     const settings = await this.ownerSettingService.disable2FA(ownerId);

//     res.json({
//       success: true,
//       message: "Two-factor authentication disabled successfully",
//       data: {
//         twoFactorEnabled: settings.twoFactorEnabled,
//       },
//     });
//   };

//   // Update notification preferences
//   updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;
//     const { channels, types, quietHours } = req.body;

//     const updates: any = {};

//     if (channels) {
//       if (channels.email !== undefined)
//         updates.emailNotifications = channels.email;
//       if (channels.sms !== undefined) updates.smsNotifications = channels.sms;
//       if (channels.push !== undefined)
//         updates.pushNotifications = channels.push;
//       if (channels.whatsapp !== undefined)
//         updates.whatsappNotifications = channels.whatsapp;
//     }

//     if (types) {
//       if (types.newBooking !== undefined)
//         updates.notifyNewBooking = types.newBooking;
//       if (types.cancellation !== undefined)
//         updates.notifyCancellation = types.cancellation;
//       if (types.payment !== undefined)
//         updates.notifyPaymentReceived = types.payment;
//       if (types.dailySummary !== undefined)
//         updates.dailySummary = types.dailySummary;
//       if (types.weeklyReport !== undefined)
//         updates.weeklyReport = types.weeklyReport;
//     }

//     if (quietHours) {
//       updates.notificationQuietHoursStart = quietHours.start;
//       updates.notificationQuietHoursEnd = quietHours.end;
//     }

//     const settings = await this.ownerSettingService.updateOwnerSettings(
//       ownerId,
//       updates
//     );

//     res.json({
//       success: true,
//       message: "Notification preferences updated successfully",
//       data: settings,
//     });
//   };

//   getNotificationChannels = async (req: AuthRequest, res: Response) => {
//     const ownerId = req.user!.id;

//     const channels =
//       await this.ownerSettingService.getEnabledNotificationChannels(ownerId);

//     res.json({
//       success: true,
//       data: { channels },
//     });
//   };
// }

import { Response } from "express";
import { TurfSettingService } from "../services/turf-setting.service";
import { OwnerSettingService } from "../services/owner-setting.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class SettingController {
  private turfSettingService: TurfSettingService;
  private ownerSettingService: OwnerSettingService;

  constructor() {
    this.turfSettingService = new TurfSettingService();
    this.ownerSettingService = new OwnerSettingService();
  }

  getTurfSettings = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.query;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const settings = await this.turfSettingService.getTurfSettingsByCategory(
      turfId as string
    );

    res.json({
      success: true,
      data: settings,
    });
  };

  // --- MODIFIED METHOD ---
  updateTurfSettings = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;
    // Get the nested structure from the frontend
    const { turfId, settings } = req.body;

    // --- Validation ---
    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }
    if (!settings) {
      return res.status(400).json({ error: "Settings object is required" });
    }

    const { booking, notifications, payment, general } = settings;

    // --- Data Transformation (Flattening) ---
    // Map the nested structure from the frontend to the flat
    // TurfSettingUpdate interface expected by the service.
    const flatUpdates = {
      // Booking
      ...(booking && {
        bookingEnabled: booking.enabled,
        bookingDisabledReason: booking.disabledReason,
        autoConfirmBooking: booking.autoConfirm,
        maxBookingHours: booking.maxHours,
        minBookingHours: booking.minHours,
        advanceBookingDays: booking.advanceDays,
        cancellationDeadlineHours: booking.cancellationDeadline,
        bufferTimeMinutes: booking.bufferTime,
      }),
      // Notifications
      ...(notifications && {
        notifyOnNewBooking: notifications.onNewBooking,
        notifyOnCancellation: notifications.onCancellation,
        notifyOnPayment: notifications.onPayment,
        reminderBeforeHours: notifications.reminderBefore,
      }),
      // Payment
      ...(payment && {
        requireAdvancePayment: payment.requireAdvance,
        advancePaymentPercentage: payment.advancePercentage,
        refundEnabled: payment.refundEnabled,
        refundPercentage: payment.refundPercentage,
      }),
      // General
      ...(general && {
        timezone: general.timezone,
        maintenanceMode: general.maintenanceMode,
        maintenanceMessage: general.maintenanceMessage,
      }),
    };

    // --- Service Call ---
    // Pass the new flatUpdates object to the service
    const updatedSettings = await this.turfSettingService.updateTurfSettings(
      turfId,
      ownerId,
      flatUpdates
    );

    // --- Response ---
    res.json({
      success: true,
      message: "Turf settings updated successfully",
      // Return the full settings object from the service
      data: updatedSettings,
    });
  };
  // --- END OF MODIFIED METHOD ---

  toggleBookingStatus = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;
    const { turfId, enabled, reason } = req.body;

    if (!turfId || enabled === undefined) {
      return res.status(400).json({
        error: "Turf ID and enabled status are required",
      });
    }

    const settings = await this.turfSettingService.updateTurfSettings(
      turfId,
      ownerId,
      {
        bookingEnabled: enabled,
        bookingDisabledReason: reason,
      }
    );

    res.json({
      success: true,
      message: `Bookings ${enabled ? "enabled" : "disabled"} successfully`,
      data: {
        bookingEnabled: settings.bookingEnabled,
        bookingDisabledReason: settings.bookingDisabledReason,
      },
    });
  };

  toggleMaintenanceMode = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;
    const { turfId, enabled, message } = req.body;

    if (!turfId || enabled === undefined) {
      return res.status(400).json({
        error: "Turf ID and enabled status are required",
      });
    }

    const settings = await this.turfSettingService.updateTurfSettings(
      turfId,
      ownerId,
      {
        maintenanceMode: enabled,
        maintenanceMessage: message,
      }
    );

    res.json({
      success: true,
      message: `Maintenance mode ${
        enabled ? "enabled" : "disabled"
      } successfully`,
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
    });
  };

  checkBookingAllowed = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.query;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const result = await this.turfSettingService.isBookingAllowed(
      turfId as string
    );

    res.json({
      success: true,
      data: result,
    });
  };

  getOwnerSettings = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;

    const settings = await this.ownerSettingService.getOwnerSettingsByCategory(
      ownerId
    );

    res.json({
      success: true,
      data: settings,
    });
  };

  updateOwnerSettings = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;
    const updates = req.body;

    const settings = await this.ownerSettingService.updateOwnerSettings(
      ownerId,
      updates
    );

    res.json({
      success: true,
      message: "Owner settings updated successfully",
      data: settings,
    });
  };

  // Enable 2FA
  enable2FA = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;
    const { method } = req.body;

    if (!method) {
      return res.status(400).json({ error: "2FA method is required" });
    }

    if (!["sms", "email", "authenticator"].includes(method)) {
      return res.status(400).json({
        error: "Invalid 2FA method. Must be: sms, email, or authenticator",
      });
    }

    const settings = await this.ownerSettingService.enable2FA(ownerId, method);

    res.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
      data: {
        twoFactorEnabled: settings.twoFactorEnabled,
        twoFactorMethod: settings.twoFactorMethod,
      },
    });
  };

  // Disable 2FA
  disable2FA = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;

    const settings = await this.ownerSettingService.disable2FA(ownerId);

    res.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
      data: {
        twoFactorEnabled: settings.twoFactorEnabled,
      },
    });
  };

  // Update notification preferences
  updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;
    const { channels, types, quietHours } = req.body;

    const updates: any = {};

    if (channels) {
      if (channels.email !== undefined)
        updates.emailNotifications = channels.email;
      if (channels.sms !== undefined) updates.smsNotifications = channels.sms;
      if (channels.push !== undefined)
        updates.pushNotifications = channels.push;
      if (channels.whatsapp !== undefined)
        updates.whatsappNotifications = channels.whatsapp;
    }

    if (types) {
      if (types.newBooking !== undefined)
        updates.notifyNewBooking = types.newBooking;
      if (types.cancellation !== undefined)
        updates.notifyCancellation = types.cancellation;
      if (types.payment !== undefined)
        updates.notifyPaymentReceived = types.payment;
      if (types.dailySummary !== undefined)
        updates.dailySummary = types.dailySummary;
      if (types.weeklyReport !== undefined)
        updates.weeklyReport = types.weeklyReport;
    }

    if (quietHours) {
      updates.notificationQuietHoursStart = quietHours.start;
      updates.notificationQuietHoursEnd = quietHours.end;
    }

    const settings = await this.ownerSettingService.updateOwnerSettings(
      ownerId,
      updates
    );

    res.json({
      success: true,
      message: "Notification preferences updated successfully",
      data: settings,
    });
  };

  getNotificationChannels = async (req: AuthRequest, res: Response) => {
    const ownerId = req.user!.id;

    const channels =
      await this.ownerSettingService.getEnabledNotificationChannels(ownerId);

    res.json({
      success: true,
      data: { channels },
    });
  };
}
