import { Repository } from "typeorm";
import { Review } from "../entities/review.entity";
import { ReviewReport } from "../entities/review-report.entity";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { AppDataSource } from "../db/data.source";

export class ReviewService {
  private reviewRepository: Repository<Review>;
  private bookingRepository: Repository<Booking>;
  private reportRepository: Repository<ReviewReport>;

  constructor() {
    this.reviewRepository = AppDataSource.getRepository(Review);
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.reportRepository = AppDataSource.getRepository(ReviewReport);
  }

  async createReview(
    userId: string,
    bookingId: string,
    rating: number,
    comment?: string
  ) {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Verify booking exists and belongs to user
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ["user"],
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.userId !== userId) {
      throw new Error("You can only review your own bookings");
    }

    // Check if booking is completed (past end time)
    if (booking.endTime > new Date()) {
      throw new Error(
        "Cannot review a booking that has not been completed yet"
      );
    }

    if (
      booking.status !== BookingStatus.ACTIVE &&
      booking.status !== BookingStatus.COMPLETED
    ) {
      throw new Error("Cannot review a cancelled booking");
    }

    // Check if review already exists
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, bookingId },
    });

    if (existingReview) {
      throw new Error("You have already reviewed this booking");
    }

    const review = this.reviewRepository.create({
      userId,
      bookingId,
      turfId: booking.turfId,
      rating,
      comment: comment || "",
    });

    return await this.reviewRepository.save(review);
  }

  async getAllReviews() {
    return await this.reviewRepository
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.user", "user")
      .leftJoinAndSelect("review.booking", "booking")
      .orderBy("review.createdAt", "DESC")
      .select([
        "review",
        "user.id",
        "user.name",
        "booking.id",
        "booking.date",
        "booking.startTime",
        "booking.endTime",
      ])
      .getMany();
  }

  async getUserReviews(userId: string) {
    return await this.reviewRepository
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.booking", "booking")
      .where("review.userId = :userId", { userId })
      .orderBy("review.createdAt", "DESC")
      .getMany();
  }

  async getBookingReview(bookingId: string) {
    return await this.reviewRepository
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.user", "user")
      .where("review.bookingId = :bookingId", { bookingId })
      .getOne();
  }

  async getAverageRating(): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "average")
      .getRawOne();

    return result.average ? parseFloat(result.average) : 0;
  }

  async getRatingDistribution() {
    const distribution = await this.reviewRepository
      .createQueryBuilder("review")
      .select("review.rating", "rating")
      .addSelect("COUNT(*)", "count")
      .groupBy("review.rating")
      .orderBy("review.rating", "DESC")
      .getRawMany();

    return distribution.map((d) => ({
      rating: parseInt(d.rating),
      count: parseInt(d.count),
    }));
  }


  async updateReview(
    userId: string,
    reviewId: string,
    rating: number,
    comment?: string
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== userId) {
      throw new Error("You can only update your own reviews");
    }

    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    review.rating = rating;
    review.comment = comment || review.comment;

    return await this.reviewRepository.save(review);
  }

  async deleteReview(userId: string, reviewId: string, isAdmin: boolean = false) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Review not found");
    }

    if (!isAdmin && review.userId !== userId) {
      throw new Error("You can only delete your own reviews");
    }

    return await this.reviewRepository.remove(review);
  }

  async reportReview(userId: string, reviewId: string, reason: string) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Review not found");
    }
    
    const existingReport = await this.reportRepository.findOne({
        where: { userId, reviewId }
    });
    
    if (existingReport) {
        throw new Error("You have already reported this review");
    }

    const report = this.reportRepository.create({
      userId,
      reviewId,
      reason,
      status: "pending",
    });

    return await this.reportRepository.save(report);
  }

  async getReviewReports() {
    return await this.reportRepository.find({
      relations: ["review", "review.user", "user"],
      order: { createdAt: "DESC" },
    });
  }
}
