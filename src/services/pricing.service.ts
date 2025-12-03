import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from "typeorm";
import { Pricing, DayType } from "../entities/pricing.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";
import { toZonedTime } from "date-fns-tz";

interface PricingRuleInput {
  dayType?: DayType;
  specificDate?: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  price: number;
  priority?: number;
  name?: string;
}

export class PricingService {
  private pricingRepository: Repository<Pricing>;
  private turfRepository: Repository<Turf>;

  constructor() {
    this.pricingRepository = AppDataSource.getRepository(Pricing);
    this.turfRepository = AppDataSource.getRepository(Turf);
  }

  async calculatePrice(
    turfId: string,
    startTime: Date,
    endTime: Date,
    date: string,
    timezone: string = "Asia/Kolkata"
  ): Promise<number> {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayType =
      dayOfWeek === 0 || dayOfWeek === 6 ? DayType.WEEKEND : DayType.WEEKDAY;

    // Fetch all active rules for this turf
    const rules = await this.pricingRepository.find({
      where: { turfId, isActive: true },
      order: { priority: "DESC" }, // Check highest priority first
    });

    let totalPrice = 0;
    
    // Convert to Turf's timezone for calculation
    const zonedStart = toZonedTime(startTime, timezone);
    const zonedEnd = toZonedTime(endTime, timezone);

    // Calculate total duration in minutes
    const totalDurationMinutes = (zonedEnd.getTime() - zonedStart.getTime()) / (1000 * 60);
    
    // We need to iterate through time blocks and apply rules
    // Simplest approach: Iterate minute by minute? No, too slow.
    // Better: Iterate through rules and find overlap.
    // Or: Iterate through hours? But we have partial hours.
    
    // Let's iterate through the duration in 30-min chunks or just calculate overlap with each rule.
    // But rules might overlap each other (priority).
    // So we need to find the "winning" rule for each time segment.
    
    // Approach:
    // 1. Define the booking interval [start, end]
    // 2. Break it down into segments based on rule boundaries?
    // 3. Or just iterate hour by hour (and partial start/end)?
    // Most rules are hourly based (start hour, end hour).
    
    const startHour = zonedStart.getHours();
    const startMinute = zonedStart.getMinutes();
    const endHour = zonedEnd.getHours();
    const endMinute = zonedEnd.getMinutes();
    
    // Normalize end hour for midnight (if 00:00 next day, treat as 24:00)
    // Note: zonedEnd might be next day.
    // If booking spans days, we need to handle that.
    // Assuming single day booking for now as per current logic.
    
    // Let's iterate through each hour covered by the booking
    // e.g. 14:30 to 16:00
    // Hour 14: 30 mins (14:30 - 15:00)
    // Hour 15: 60 mins (15:00 - 16:00)
    
    let current = new Date(zonedStart);
    while (current < zonedEnd) {
        // Get the end of the current hour
        const nextHour = new Date(current);
        nextHour.setHours(current.getHours() + 1, 0, 0, 0);
        
        // The segment end is either the next hour or the booking end
        const segmentEnd = nextHour < zonedEnd ? nextHour : zonedEnd;
        
        // Calculate duration of this segment in hours
        const segmentDurationHours = (segmentEnd.getTime() - current.getTime()) / (1000 * 60 * 60);
        
        // Find price for this hour
        const hourPrice = this.getPriceForHour(
            rules,
            current.getHours(),
            dateObj,
            dayType
        );
        
        totalPrice += hourPrice * segmentDurationHours;
        
        // Move to next segment
        current = segmentEnd;
    }

    return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
  }

  private getPriceForHour(
    rules: Pricing[],
    hour: number,
    date: Date,
    dayType: DayType
  ): number {
    // Filter rules that match the criteria
    const matchingRules = rules.filter((rule) => {
      try {
        // 1. Check date/day type match
        let dateMatch = false;
        if (rule.specificDate) {
          const ruleDate = new Date(rule.specificDate);
          dateMatch =
            ruleDate.toISOString().split("T")[0] ===
            date.toISOString().split("T")[0];
        } else {
          dateMatch = rule.dayType === dayType;
        }

        if (!dateMatch) return false;

        // 2. Check time match
        if (typeof rule.startTime !== 'string' || typeof rule.endTime !== 'string') {
            console.warn(`Invalid time format for rule ${rule.id}: startTime=${rule.startTime}, endTime=${rule.endTime}`);
            return false;
        }

        const ruleStart = parseInt(rule.startTime.split(":")[0]);
        const ruleEnd = parseInt(rule.endTime.split(":")[0]);
        
        // Handle midnight crossing if needed (assuming simple daily slots for now)
        // If ruleEnd is 00, treat as 24
        const effectiveRuleEnd = ruleEnd === 0 ? 24 : ruleEnd;

        return hour >= ruleStart && hour < effectiveRuleEnd;
      } catch (err) {
        console.error(`Error processing rule ${rule.id}:`, err);
        return false;
      }
    });

    if (matchingRules.length === 0) {
      // Default fallback or error? For now, throw error to ensure configuration
      throw new AppError(
        `No pricing configured for hour ${hour}:00 on ${date.toISOString().split("T")[0]}`,
        404
      );
    }

    // Since we sorted by priority DESC in the query, the first match is the best one
    const price = Number(matchingRules[0].price);
    if (isNaN(price)) {
        throw new AppError(`Invalid price configuration for rule ${matchingRules[0].id}`, 500);
    }
    return price;
  }

  async getAllPricing(turfId: string) {
    const pricing = await this.pricingRepository.find({
      where: { turfId },
      order: {
        priority: "DESC",
        dayType: "ASC",
        startTime: "ASC",
      },
    });

    return pricing;
  }

  async updatePricing(
    turfId: string,
    ownerId: string,
    rules: PricingRuleInput[]
  ) {
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
      // For simplicity in this iteration, we might want to replace rules or add new ones.
      // Let's assume this method adds/updates rules.
      // If we want to fully replace, we'd delete existing ones first.
      // Let's implement "replace all" for a clean state if that's the intent, 
      // or just "add/update".
      // Given the complexity, let's assume the UI sends a full set of rules to replace the old ones
      // OR we just append. Let's go with APPEND/UPDATE for now, but maybe we need a clear way to manage.
      // Let's just save the new rules provided.

      for (const rule of rules) {
        const newPricing = this.pricingRepository.create({
          turfId,
          dayType: rule.dayType,
          specificDate: rule.specificDate ? new Date(rule.specificDate) : undefined,
          startTime: rule.startTime,
          endTime: rule.endTime,
          price: rule.price,
          priority: rule.priority || 0,
          name: rule.name,
        });
        await queryRunner.manager.save(newPricing);
      }

      await queryRunner.commitTransaction();
      return await this.getAllPricing(turfId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createDefaultPricing(turfId: string) {
    const defaultRules = [
      // Weekday
      {
        dayType: DayType.WEEKDAY,
        startTime: "06:00",
        endTime: "12:00",
        price: 500,
        priority: 1,
        name: "Weekday Morning",
      },
      {
        dayType: DayType.WEEKDAY,
        startTime: "12:00",
        endTime: "18:00",
        price: 700,
        priority: 1,
        name: "Weekday Afternoon",
      },
      {
        dayType: DayType.WEEKDAY,
        startTime: "18:00",
        endTime: "24:00", // Midnight
        price: 1000,
        priority: 1,
        name: "Weekday Evening",
      },
      // Weekend
      {
        dayType: DayType.WEEKEND,
        startTime: "06:00",
        endTime: "12:00",
        price: 700,
        priority: 1,
        name: "Weekend Morning",
      },
      {
        dayType: DayType.WEEKEND,
        startTime: "12:00",
        endTime: "18:00",
        price: 1000,
        priority: 1,
        name: "Weekend Afternoon",
      },
      {
        dayType: DayType.WEEKEND,
        startTime: "18:00",
        endTime: "24:00",
        price: 1500,
        priority: 1,
        name: "Weekend Evening",
      },
    ];

    const pricingEntities = defaultRules.map((p) =>
      this.pricingRepository.create({ ...p, turfId })
    );

    await this.pricingRepository.save(pricingEntities);
    return await this.getAllPricing(turfId);
  }

  async deletePricingForTurf(turfId: string) {
    await this.pricingRepository.delete({ turfId });
  }
}
