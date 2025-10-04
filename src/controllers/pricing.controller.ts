import { Response } from "express";
import { PricingService } from "../services/pricing.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class PricingController {
  private pricingService: PricingService;

  constructor() {
    this.pricingService = new PricingService();
  }

  getPricing = async (req: AuthRequest, res: Response) => {
    const pricing = await this.pricingService.getAllPricing();
    res.json(pricing);
  };

  updatePricing = async (req: AuthRequest, res: Response) => {
    const { weekday, weekend } = req.body;
    const pricing = await this.pricingService.updatePricing({
      weekday,
      weekend,
    });
    res.json({ message: "Pricing updated", pricing });
  };
}
