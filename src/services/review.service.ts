import { Repository } from "typeorm";
import { Review } from "../entities/review.entity";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { AppDataSource } from "../db/data.source";

export class ReviewService {
  private reviewRepository: Repository<Review>;
  private bookingRepository: Repository<Booking>;

  constructor() {
    this.reviewRepository = AppDataSource.getRepository(Review);
    this.bookingRepository = AppDataSource.getRepository(Booking);
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
}
