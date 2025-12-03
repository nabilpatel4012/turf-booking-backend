
import { Pricing, DayType } from "./src/entities/pricing.entity";
import { AppError } from "./src/middleware/error.middleware";

// Mock Repository
const mockPricingRepo = {
  find: async () => {
    return [
      {
        id: "1",
        turfId: "ec747102-a1dc-47e7-a7de-310377f71893",
        dayType: DayType.WEEKDAY,
        startTime: "09:00:00",
        endTime: "18:00:00",
        price: "NaN", // Simulate corrupted data
        priority: 1,
        isActive: true,
      } as any,
    ];
  },
};

const mockTurfRepo = {
    findOne: async () => ({})
};

// Mock AppDataSource
const AppDataSource = {
  getRepository: (entity: any) => {
    if (entity === Pricing) return mockPricingRepo;
    return mockTurfRepo;
  },
};

// Copy of PricingService to inject mocks
class PricingService {
  private pricingRepository: any;
  private turfRepository: any;

  constructor() {
    this.pricingRepository = AppDataSource.getRepository(Pricing);
    this.turfRepository = AppDataSource.getRepository("Turf");
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
    
    console.log(`startHour: ${startHour}, endHour: ${endHour}, duration: ${duration}`);

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

        console.log(`Checking rule: ${rule.startTime}-${rule.endTime} against hour ${hour}`);
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
}

async function test() {
  const service = new PricingService();
  const turfId = "ec747102-a1dc-47e7-a7de-310377f71893";
  const date = "2025-12-03";
  const startTime = new Date("2025-12-03T11:30:00.000Z");
  const endTime = new Date("2025-12-03T12:30:00.000Z");

  try {
    const price = await service.calculatePrice(turfId, startTime, endTime, date);
    console.log("Price:", price);
    if (isNaN(price)) {
        console.log("Price is NaN");
    }
  } catch (error) {
    console.error("Caught error:", error);
  }
}

test();
