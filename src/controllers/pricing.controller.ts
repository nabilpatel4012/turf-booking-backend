import { Response } from "express";
import { PricingService } from "../services/pricing.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AuthRole } from "../services/auth.service";

export class PricingController {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  // Get pricing for a specific turf (Public - accessible by users)
  getPricing = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.query;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const pricing = await this.pricingService.getAllPricing(turfId as string);

    res.json({
      success: true,
      turfId,
      data: pricing,
    });
  };

  // Update pricing for a turf (Admin only - must be owner)
  updatePricing = async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { turfId, weekday, weekend } = req.body;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const pricing = await this.pricingService.updatePricing(turfId, adminId, {
      weekday,
      weekend,
    });

    res.json({
      success: true,
      message: "Pricing updated successfully",
      data: pricing,
    });
  };

  // Create default pricing for a turf (Admin only)
  createDefaultPricing = async (req: AuthRequest, res: Response) => {
    const { turfId } = req.body;

    if (!turfId) {
      return res.status(400).json({ error: "Turf ID is required" });
    }

    const pricing = await this.pricingService.createDefaultPricing(turfId);

    res.status(201).json({
      success: true,
      message: "Default pricing created successfully",
      data: pricing,
    });
  };
}
