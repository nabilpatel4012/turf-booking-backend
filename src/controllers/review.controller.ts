import { Response } from "express";
import { ReviewService } from "../services/review.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  createReview = async (req: AuthRequest, res: Response) => {
    const { bookingId, rating, comment } = req.body;
    const review = await this.reviewService.createReview(
      req.user!.id,
      bookingId,
      rating,
      comment
    );
    res.status(201).json(review);
  };

  getAllReviews = async (req: AuthRequest, res: Response) => {
    const reviews = await this.reviewService.getAllReviews();
    res.json(reviews);
  };

  getAverageRating = async (req: AuthRequest, res: Response) => {
    const average = await this.reviewService.getAverageRating();
    res.json({ averageRating: average });
  };

  getRatingDistribution = async (req: AuthRequest, res: Response) => {
    const distribution = await this.reviewService.getRatingDistribution();
    res.json(distribution);
  };
}
