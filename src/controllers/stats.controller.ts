import { Response } from "express";
import { StatsService } from "../services/stats.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class StatsController {
  private statsService: StatsService;

  constructor() {
    this.statsService = new StatsService();
  }

  getAdminStats = async (req: AuthRequest, res: Response) => {
    const stats = await this.statsService.getAdvancedAdminStats();
    res.json(stats);
  };
}
