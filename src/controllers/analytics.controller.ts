import { Response } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class AnalyticsController {
  private analyticsService = new AnalyticsService();

  getDailyRevenue = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const ownerId = req.user.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 90;
      const data = await this.analyticsService.getDailyRevenue(ownerId, days);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching daily revenue", error });
    }
  };

  getMonthlyRevenue = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const ownerId = req.user.id;
      const months = req.query.months ? parseInt(req.query.months as string) : 12;
      const data = await this.analyticsService.getMonthlyRevenue(ownerId, months);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching monthly revenue", error });
    }
  };

  getTopPerformingTurfs = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const ownerId = req.user.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const data = await this.analyticsService.getTopPerformingTurfs(ownerId, days);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching top performing turfs", error });
    }
  };

  getPeakHours = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const ownerId = req.user.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 60;
      const data = await this.analyticsService.getPeakHours(ownerId, days);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching peak hours", error });
    }
  };

  getCustomerSegmentation = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const data = await this.analyticsService.getCustomerSegmentation(ownerId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching customer segmentation", error });
    }
  };

  getCustomerCohorts = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const months = req.query.months ? parseInt(req.query.months as string) : 12;
        const data = await this.analyticsService.getCustomerCohorts(ownerId, months);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching customer cohorts", error });
    }
  };

  getCancellationAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 12;
        const data = await this.analyticsService.getCancellationAnalytics(ownerId, weeks);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cancellation analytics", error });
    }
  };

  getTopCancellationReasons = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const days = req.query.days ? parseInt(req.query.days as string) : 90;
        const data = await this.analyticsService.getTopCancellationReasons(ownerId, days);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cancellation reasons", error });
    }
  };

  getRatingTrends = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const months = req.query.months ? parseInt(req.query.months as string) : 6;
        const data = await this.analyticsService.getRatingTrends(ownerId, months);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching rating trends", error });
    }
  };

  getBookingForecast = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 26;
        const data = await this.analyticsService.getBookingForecast(ownerId, weeks);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching booking forecast", error });
    }
  };

  getOperationalKPIs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        const data = await this.analyticsService.getOperationalKPIs(ownerId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching operational KPIs", error });
    }
  };
}
