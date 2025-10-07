import { Repository } from "typeorm";
import { Pricing, DayType, TimeSlot } from "../entities/pricing.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

interface PricingUpdate {
  weekday?: { [key: string]: number };
  weekend?: { [key: string]: number };
}

export class PricingService {
  private pricingRepository: Repository<Pricing>;
  private turfRepository: Repository<Turf>;
  private pricingCache: Map<string, { price: number; expiry: number }> =
    new Map();
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.pricingRepository = AppDataSource.getRepository(Pricing);
    this.turfRepository = AppDataSource.getRepository(Turf);
  }

  async calculatePrice(
    turfId: string,
    startTime: Date,
    endTime: Date,
    date: string
  ): Promise<number> {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayType =
      dayOfWeek === 0 || dayOfWeek === 6 ? DayType.WEEKEND : DayType.WEEKDAY;

    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const startHour = startTime.getHours();

    let timeSlot = TimeSlot.EVENING;
    if (startHour >= 6 && startHour < 12) {
      timeSlot = TimeSlot.MORNING;
    } else if (startHour >= 12 && startHour < 18) {
      timeSlot = TimeSlot.AFTERNOON;
    }

    const pricePerHour = await this.getPriceFromCache(
      turfId,
      dayType,
      timeSlot
    );
    return pricePerHour * hours;
  }

  private async getPriceFromCache(
    turfId: string,
    dayType: DayType,
    timeSlot: TimeSlot
  ): Promise<number> {
    const now = Date.now();
    const cacheKey = `${turfId}_${dayType}_${timeSlot}`;

    const cached = this.pricingCache.get(cacheKey);
    if (cached && now < cached.expiry) {
      return cached.price;
    }

    // Fetch from database
    const pricing = await this.pricingRepository.findOne({
      where: { turfId, dayType, timeSlot },
    });

    if (!pricing) {
      throw new AppError(
        `Pricing not configured for this turf (${dayType} ${timeSlot})`,
        404
      );
    }

    const price = parseFloat(pricing.price.toString());

    // Cache the price
    this.pricingCache.set(cacheKey, {
      price,
      expiry: now + this.cacheDuration,
    });

    return price;
  }

  async getAllPricing(turfId: string) {
    const pricing = await this.pricingRepository.find({
      where: { turfId },
      order: { dayType: "ASC", timeSlot: "ASC" },
    });

    if (pricing.length === 0) {
      throw new AppError("Pricing not configured for this turf", 404);
    }

    const formatted: any = { weekday: {}, weekend: {} };
    pricing.forEach((p) => {
      formatted[p.dayType][p.timeSlot] = parseFloat(p.price.toString());
    });

    return formatted;
  }

  async updatePricing(turfId: string, ownerId: string, updates: PricingUpdate) {
    // Verify ownership
    const turf = await this.turfRepository.findOne({
      where: { id: turfId, ownerId },
    });

    if (!turf) {
      throw new AppError("Turf not found or unauthorized", 404);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const [dayType, slots] of Object.entries(updates)) {
        if (slots) {
          for (const [timeSlot, rawPrice] of Object.entries(slots)) {
            const price = Number(rawPrice); // safely cast
            if (isNaN(price)) continue; // skip invalid

            const existing = await queryRunner.manager.findOne(Pricing, {
              where: {
                turfId,
                dayType: dayType as DayType,
                timeSlot: timeSlot as TimeSlot,
              },
            });

            if (existing) {
              await queryRunner.manager.update(
                Pricing,
                {
                  turfId,
                  dayType: dayType as DayType,
                  timeSlot: timeSlot as TimeSlot,
                },
                { price }
              );
            } else {
              const newPricing = queryRunner.manager.create(Pricing, {
                turfId,
                dayType: dayType as DayType,
                timeSlot: timeSlot as TimeSlot,
                price,
              });
              await queryRunner.manager.save(newPricing);
            }
          }
        }
      }

      await queryRunner.commitTransaction();

      // Invalidate cache for this turf
      this.invalidateCacheForTurf(turfId);

      return await this.getAllPricing(turfId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createDefaultPricing(turfId: string) {
    const defaultPricing = [
      // Weekday pricing
      { dayType: DayType.WEEKDAY, timeSlot: TimeSlot.MORNING, price: 500 },
      { dayType: DayType.WEEKDAY, timeSlot: TimeSlot.AFTERNOON, price: 700 },
      { dayType: DayType.WEEKDAY, timeSlot: TimeSlot.EVENING, price: 1000 },
      // Weekend pricing
      { dayType: DayType.WEEKEND, timeSlot: TimeSlot.MORNING, price: 700 },
      { dayType: DayType.WEEKEND, timeSlot: TimeSlot.AFTERNOON, price: 1000 },
      { dayType: DayType.WEEKEND, timeSlot: TimeSlot.EVENING, price: 1500 },
    ];

    const pricingEntities = defaultPricing.map((p) =>
      this.pricingRepository.create({ ...p, turfId })
    );

    await this.pricingRepository.save(pricingEntities);

    return await this.getAllPricing(turfId);
  }

  async deletePricingForTurf(turfId: string) {
    await this.pricingRepository.delete({ turfId });
    this.invalidateCacheForTurf(turfId);
  }

  private invalidateCacheForTurf(turfId: string) {
    const keysToDelete: string[] = [];

    this.pricingCache.forEach((_, key) => {
      if (key.startsWith(`${turfId}_`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.pricingCache.delete(key));
  }
}
