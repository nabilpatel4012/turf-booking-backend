import { Response } from "express";
import { StatsService } from "../services/stats.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class StatsController {
  private statsService: StatsService;

  constructor() {
    this.statsService = new StatsService();
  }

  getAdminStats = async (req: AuthRequest, res: Response) => {
    if (req.user && req.user?.role === "admin") {
      const adminId = req.user.id;
      const stats = await this.statsService.getAdvancedAdminStats(
        adminId,
        true
      );
      res.json(stats);
    } else {
      res.json({ error: "You don't have access to this service" }).status(403);
    }
  };
}
