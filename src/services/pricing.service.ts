import { Repository } from "typeorm";
import { Pricing, DayType, TimeSlot } from "../entities/pricing.entity";
import { AppDataSource } from "../db/data.source";

interface PricingUpdate {
  weekday?: { [key: string]: number };
  weekend?: { [key: string]: number };
}

export class PricingService {
  private pricingRepository: Repository<Pricing>;
  private pricingCache: Map<string, number> = new Map();
  private cacheExpiry: number = 0;
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.pricingRepository = AppDataSource.getRepository(Pricing);
  }

  async calculatePrice(
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

    const pricePerHour = await this.getPriceFromCache(dayType, timeSlot);
    return pricePerHour * hours;
  }

  private async getPriceFromCache(
    dayType: DayType,
    timeSlot: TimeSlot
  ): Promise<number> {
    const now = Date.now();
    const cacheKey = `${dayType}_${timeSlot}`;

    if (now < this.cacheExpiry && this.pricingCache.has(cacheKey)) {
      return this.pricingCache.get(cacheKey)!;
    }

    // Refresh cache
    if (now >= this.cacheExpiry) {
      await this.refreshCache();
    }

    const price = this.pricingCache.get(cacheKey);
    if (!price) {
      throw new Error(`Price not found for ${dayType} ${timeSlot}`);
    }

    return price;
  }

  private async refreshCache() {
    const allPricing = await this.pricingRepository.find();

    this.pricingCache.clear();
    allPricing.forEach((pricing) => {
      const key = `${pricing.dayType}_${pricing.timeSlot}`;
      this.pricingCache.set(key, parseFloat(pricing.price.toString()));
    });

    this.cacheExpiry = Date.now() + this.cacheDuration;
  }

  async getAllPricing() {
    const pricing = await this.pricingRepository.find({
      order: { dayType: "ASC", timeSlot: "ASC" },
    });

    const formatted: any = { weekday: {}, weekend: {} };
    pricing.forEach((p) => {
      formatted[p.dayType][p.timeSlot] = parseFloat(p.price.toString());
    });

    return formatted;
  }

  async updatePricing(updates: PricingUpdate) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const [dayType, slots] of Object.entries(updates)) {
        if (slots) {
          for (const [timeSlot, price] of Object.entries(slots)) {
            await queryRunner.manager.update(
              Pricing,
              { dayType: dayType as DayType, timeSlot: timeSlot as TimeSlot },
              { price }
            );
          }
        }
      }

      await queryRunner.commitTransaction();

      // Invalidate cache
      this.cacheExpiry = 0;

      return await this.getAllPricing();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
