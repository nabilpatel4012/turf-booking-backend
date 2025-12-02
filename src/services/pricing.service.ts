import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from "typeorm";
import { Pricing, DayType } from "../entities/pricing.entity";
import { Turf } from "../entities/turf.entity";
import { AppDataSource } from "../db/data.source";
import { AppError } from "../middleware/error.middleware";

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
    date: string
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
    const startHour = startTime.getHours();
    const endHour = endTime.getHours() === 0 ? 24 : endTime.getHours(); // Handle midnight
    const duration = endHour - startHour;

    // Calculate price for each hour block
    for (let i = 0; i < duration; i++) {
      const currentHour = startHour + i;
      const hourPrice = this.getPriceForHour(
        rules,
        currentHour,
        dateObj,
        dayType
      );
      totalPrice += hourPrice;
    }

    return totalPrice;
  }

  private getPriceForHour(
    rules: Pricing[],
    hour: number,
    date: Date,
    dayType: DayType
  ): number {
    // Filter rules that match the criteria
    const matchingRules = rules.filter((rule) => {
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
      const ruleStart = parseInt(rule.startTime.split(":")[0]);
      const ruleEnd = parseInt(rule.endTime.split(":")[0]);
      
      // Handle midnight crossing if needed (assuming simple daily slots for now)
      // If ruleEnd is 00, treat as 24
      const effectiveRuleEnd = ruleEnd === 0 ? 24 : ruleEnd;

      return hour >= ruleStart && hour < effectiveRuleEnd;
    });

    if (matchingRules.length === 0) {
      // Default fallback or error? For now, throw error to ensure configuration
      throw new AppError(
        `No pricing configured for hour ${hour}:00 on ${date.toISOString().split("T")[0]}`,
        404
      );
    }

    // Since we sorted by priority DESC in the query, the first match is the best one
    // But we need to handle specificDate vs dayType precedence if priorities are equal?
    // Actually, explicit priority field handles this. Users should set higher priority for specific dates.
    return Number(matchingRules[0].price);
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
