import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { Review } from "../entities/review.entity";
import { AppDataSource } from "../db/data.source";
import { BookingService } from "./booking.service";

interface CachedStats {
  data: any;
  timestamp: number;
}

export class StatsService {
  private userRepository: Repository<User>;
  private bookingRepository: Repository<Booking>;
  private reviewRepository: Repository<Review>;
  private bookingService: BookingService;

  private cache: Map<string, CachedStats> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.reviewRepository = AppDataSource.getRepository(Review);
    this.bookingService = new BookingService();
  }

  /**
   * Creates a base query for bookings that is pre-filtered for a specific admin's turfs.
   * @param adminId The ID of the admin (owner).
   * @returns A TypeORM QueryBuilder instance.
   */
  private createAdminFilteredBookingQuery(adminId: string) {
    return this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoin("booking.turf", "turf")
      .where("turf.ownerId = :adminId", { adminId });
  }

  async getAdvancedAdminStats(adminId: string, useCache: boolean = true) {
    // Make the cache key specific to the admin to prevent data leakage
    const cacheKey = `advanced_admin_stats_${adminId}`;

    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Pass adminId to the computation logic
    const promise = this.computeAdvancedStats(adminId);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      this.setCache(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async computeAdvancedStats(adminId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // Pass adminId to all underlying methods
    const overviewPromise = this.getOptimizedOverview(adminId);

    const last7DaysData = this.generateDateRange(now, 7, "days");
    const last7DaysPromise = this.getBatchEarnings(
      adminId,
      last7DaysData.ranges,
      last7DaysData.labels
    );

    const currentDayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(currentDay - currentDayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const currentWeekData = this.generateWeekRange(
      startOfWeek,
      currentDayOfWeek
    );
    const currentWeekPromise = this.getBatchEarnings(
      adminId,
      currentWeekData.ranges,
      currentWeekData.labels
    );

    const last5WeeksData = this.generate5WeeksRange(now, currentDayOfWeek);
    const last5WeeksPromise = this.getBatchEarnings(
      adminId,
      last5WeeksData.ranges,
      last5WeeksData.labels
    );

    const monthWeeksData = this.generateMonthWeeksRange(
      currentYear,
      currentMonth,
      now
    );
    const monthWeeksPromise = this.getBatchEarnings(
      adminId,
      monthWeeksData.ranges,
      monthWeeksData.labels
    );

    const yearMonthsData = this.generateYearMonthsRange(
      currentYear,
      currentMonth
    );
    const yearMonthsPromise = this.getBatchEarnings(
      adminId,
      yearMonthsData.ranges,
      yearMonthsData.labels
    );

    const insightsPromise = this.getOptimizedInsights(adminId);

    const [
      overview,
      last7Days,
      currentWeek,
      last5Weeks,
      monthWeeks,
      yearMonths,
      insights,
    ] = await Promise.allSettled([
      overviewPromise,
      last7DaysPromise,
      currentWeekPromise,
      last5WeeksPromise,
      monthWeeksPromise,
      yearMonthsPromise,
      insightsPromise,
    ]);

    const getResult = (result: PromiseSettledResult<any>, fallback: any = {}) =>
      result.status === "fulfilled" ? result.value : fallback;

    const overviewData = getResult(overview, {});
    const last7DaysResult = getResult(last7Days, {
      breakdown: [],
      totalEarnings: 0,
    });
    const currentWeekResult = getResult(currentWeek, {
      breakdown: [],
      totalEarnings: 0,
    });
    const last5WeeksResult = getResult(last5Weeks, {
      breakdown: [],
      totalEarnings: 0,
    });
    const monthWeeksResult = getResult(monthWeeks, {
      breakdown: [],
      totalEarnings: 0,
    });
    const yearMonthsResult = getResult(yearMonths, {
      breakdown: [],
      totalEarnings: 0,
    });
    const insightsData = getResult(insights, {});

    return {
      overview: overviewData,
      last7Days: last7DaysResult,
      currentWeek: currentWeekResult,
      last5Weeks: last5WeeksResult,
      thisMonth: monthWeeksResult,
      thisYear: {
        totalEarnings: yearMonthsResult.totalEarnings,
        breakdown: yearMonthsResult.breakdown,
      },
      insights: insightsData,
    };
  }

  private async getOptimizedOverview(adminId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [bookingStats, recentBookingsCount, userStats, reviewStats] =
        await Promise.all([
          this.createAdminFilteredBookingQuery(adminId)
            .select("booking.status", "status")
            .addSelect("COUNT(*)", "count")
            .groupBy("booking.status")
            .getRawMany(),

          this.createAdminFilteredBookingQuery(adminId)
            .andWhere("booking.createdAt >= :thirtyDaysAgo", { thirtyDaysAgo })
            .getCount(),

          this.createAdminFilteredBookingQuery(adminId)
            .select("COUNT(DISTINCT booking.userId)", "total")
            .addSelect(
              "COUNT(DISTINCT CASE WHEN booking.createdAt >= :thirtyDaysAgo THEN booking.userId ELSE NULL END)",
              "recent"
            )
            .setParameters({ thirtyDaysAgo })
            .getRawOne(),

          this.reviewRepository
            .createQueryBuilder("review")
            .leftJoin("review.booking", "booking")
            .leftJoin("booking.turf", "turf")
            .select("COUNT(review.id)", "total")
            .addSelect("AVG(review.rating)", "avgRating")
            .where("turf.ownerId = :adminId", { adminId })
            .getRawOne(),
        ]);

      const statusCounts: Record<string, number> = {};
      bookingStats.forEach((row) => {
        statusCounts[row.status.toLowerCase()] = parseInt(row.count || "0");
      });

      const totalBookings = Object.values(statusCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      const getStatusCount = (status: string) =>
        statusCounts[status.toLowerCase()] || 0;

      return {
        activeBookings: getStatusCount(BookingStatus.ACTIVE),
        completedBookings: getStatusCount(BookingStatus.COMPLETED),
        cancelledBookings: getStatusCount(BookingStatus.CANCELLED),
        totalBookings,
        totalUsers: parseInt(userStats?.total || "0"),
        recentUsers: parseInt(userStats?.recent || "0"),
        totalReviews: parseInt(reviewStats?.total || "0"),
        averageRating: reviewStats?.avgRating
          ? Number(parseFloat(reviewStats.avgRating).toFixed(2))
          : 0,
        bookingsByStatus: {
          active: getStatusCount(BookingStatus.ACTIVE),
          completed: getStatusCount(BookingStatus.COMPLETED),
          cancelled: getStatusCount(BookingStatus.CANCELLED),
          pending: getStatusCount(BookingStatus.PENDING),
          confirmed: getStatusCount(BookingStatus.CONFIRMED),
        },
      };
    } catch (error) {
      console.error("Error in getOptimizedOverview:", error);
      return {
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalBookings: 0,
        totalUsers: 0,
        recentUsers: 0,
        totalReviews: 0,
        averageRating: 0,
        bookingsByStatus: {
          active: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          confirmed: 0,
        },
      };
    }
  }

  private async getBatchEarnings(
    adminId: string,
    ranges: Array<{ start: Date; end: Date }>,
    labels: string[]
  ) {
    if (ranges.length === 0) {
      return { breakdown: [], totalEarnings: 0 };
    }

    let query = this.createAdminFilteredBookingQuery(adminId).andWhere(
      "booking.status != :cancelled",
      {
        cancelled: BookingStatus.CANCELLED,
      }
    );

    const selectCases = ranges.map(
      (range, idx) =>
        `COALESCE(SUM(CASE WHEN booking.createdAt >= :start${idx} AND booking.createdAt <= :end${idx} THEN booking.price ELSE 0 END), 0) as earnings${idx}`
    );

    query = query.select(selectCases);

    ranges.forEach((range, idx) => {
      query.setParameter(`start${idx}`, range.start);
      query.setParameter(`end${idx}`, range.end);
    });

    const result = await query.getRawOne();

    const breakdown = labels.map((label, idx) => ({
      [this.getLabelKey(label)]: label,
      earnings: parseFloat(result[`earnings${idx}`] || 0),
    }));

    const totalEarnings = breakdown.reduce(
      (sum, item) => sum + item.earnings,
      0
    );
    return { breakdown, totalEarnings };
  }

  private async getOptimizedInsights(adminId: string) {
    const [durationAndHours, topUsers] = await Promise.all([
      this.createAdminFilteredBookingQuery(adminId)
        .select(
          "AVG(EXTRACT(EPOCH FROM (booking.endTime - booking.startTime)) / 3600)",
          "avgDuration"
        )
        .addSelect("EXTRACT(HOUR FROM booking.startTime)", "hour")
        .addSelect("COUNT(*)", "hourCount")
        .groupBy("hour")
        .getRawMany(),

      this.createAdminFilteredBookingQuery(adminId)
        .leftJoin("booking.user", "user")
        .select("booking.userId", "userId")
        .addSelect("user.email", "email")
        .addSelect("COUNT(*)", "bookingCount")
        .addSelect("SUM(booking.price)", "totalSpent")
        .andWhere("booking.status != :cancelled", {
          cancelled: BookingStatus.CANCELLED,
        })
        .groupBy("booking.userId")
        .addGroupBy("user.email")
        .orderBy("totalSpent", "DESC")
        .limit(5)
        .getRawMany(),
    ]);

    const avgDuration =
      durationAndHours.length > 0 && durationAndHours[0].avgDuration
        ? parseFloat(Number(durationAndHours[0].avgDuration).toFixed(2))
        : 0;
    const peakBookingHours = durationAndHours
      .filter((row) => row.hour !== null)
      .map((row) => ({
        hour: parseInt(row.hour),
        count: parseInt(row.hourCount),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topUsersData = topUsers.map((r) => ({
      userId: r.userId,
      email: r.email,
      bookingCount: parseInt(r.bookingCount),
      totalSpent: parseFloat(Number(r.totalSpent).toFixed(2)),
    }));

    return {
      averageBookingDuration: avgDuration,
      peakBookingHours,
      topUsers: topUsersData,
    };
  }

  // --- Helper: Generate date ranges ---
  private generateDateRange(from: Date, count: number, unit: "days" | "weeks") {
    const ranges: Array<{ start: Date; end: Date }> = [];
    const labels: string[] = [];
    const increment = unit === "days" ? 1 : 7;

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(from);
      date.setDate(from.getDate() - i * increment);
      date.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const label =
        i === 0
          ? "Today"
          : i === 1
          ? "Yesterday"
          : date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

      labels.push(label);
      ranges.push({ start: date, end: endDate });
    }

    return { ranges, labels };
  }

  private generateWeekRange(startOfWeek: Date, currentDayOfWeek: number) {
    const ranges: Array<{ start: Date; end: Date }> = [];
    const labels: string[] = [];
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (let i = 0; i <= currentDayOfWeek; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      labels.push(dayNames[i]);
      ranges.push({ start: date, end: endDate });
    }

    return { ranges, labels };
  }

  private generate5WeeksRange(now: Date, currentDayOfWeek: number) {
    const ranges: Array<{ start: Date; end: Date }> = [];
    const labels: string[] = [];

    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - currentDayOfWeek - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      if (i === 0 && weekEnd > now) {
        weekEnd.setTime(now.getTime());
      }

      const label = i === 0 ? "This Week" : `${i} Week${i > 1 ? "s" : ""} Ago`;
      labels.push(label);
      ranges.push({ start: weekStart, end: weekEnd });
    }

    return { ranges, labels };
  }

  private generateMonthWeeksRange(year: number, month: number, now: Date) {
    const ranges: Array<{ start: Date; end: Date }> = [];
    const labels: string[] = [];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let weekCounter = 1;
    let loopDate = new Date(firstDay);

    while (loopDate <= lastDay && loopDate <= now) {
      const weekStart = new Date(loopDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const endOfWeek = weekEnd > lastDay ? lastDay : weekEnd;
      if (endOfWeek > now) {
        endOfWeek.setTime(now.getTime());
      }
      endOfWeek.setHours(23, 59, 59, 999);

      labels.push(`Week ${weekCounter}`);
      ranges.push({ start: weekStart, end: endOfWeek });

      loopDate.setDate(loopDate.getDate() + 7);
      weekCounter++;
    }

    return { ranges, labels };
  }

  private generateYearMonthsRange(year: number, currentMonth: number) {
    const ranges: Array<{ start: Date; end: Date }> = [];
    const labels: string[] = [];
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    for (let monthIndex = 0; monthIndex <= currentMonth; monthIndex++) {
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      labels.push(monthNames[monthIndex]);
      ranges.push({ start: startDate, end: endDate });
    }

    return { ranges, labels };
  }

  private getLabelKey(label: string): string {
    if (label.includes("Week")) return "week";
    if (label.match(/^\d/)) return "day"; // Starts with number
    if (label === "Today" || label === "Yesterday") return "day";
    if (
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ].includes(label)
    )
      return "day";
    return "month";
  }

  // --- Cache Management ---
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // --- Fallback: Original Simple Stats ---
  async getAdminStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      activeBookings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      totalUsers,
      totalBookings,
      // cancelledBookings,
    ] = await Promise.all([
      this.bookingService.getActiveBookingsCount(),
      this.bookingService.getTotalEarnings(today, endOfDay),
      this.bookingService.getTotalEarnings(weekAgo, now),
      this.bookingService.getTotalEarnings(monthAgo, now),
      // this.userRepository.count({ where: { role: UserRole.USER } }),
      this.bookingRepository.count(),
      this.bookingService.getCancelledBookingsCount(),
    ]);

    return {
      activeBookings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      totalUsers,
      totalBookings,
      // cancelledBookings,
    };
  }
}
