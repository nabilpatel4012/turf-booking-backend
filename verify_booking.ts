import "reflect-metadata";
import { AppDataSource } from "./src/db/data.source";
import { BookingService } from "./src/services/booking.service";
import { PricingService } from "./src/services/pricing.service";
import { AuthRole } from "./src/services/auth.service";
import { Turf, TurfStatus } from "./src/entities/turf.entity";
import { User } from "./src/entities/user.entity";
import { Admin } from "./src/entities/admin.entity";

async function main() {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");

    // Fix Schema: Add missing columns if they don't exist
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_id" text`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "order_id" text`);
    } catch (e) {
        console.warn("Schema update failed (might already exist):", e);
    } finally {
        await queryRunner.release();
    }

    const bookingService = new BookingService();
    const turfRepo = AppDataSource.getRepository(Turf);
    const userRepo = AppDataSource.getRepository(User);
    const adminRepo = AppDataSource.getRepository(Admin);

    // 1. Setup Test Data
    // Find or create a test turf
    let turf = await turfRepo.findOne({ where: {} });
    if (!turf) {
        // Create a dummy turf if none exists (simplified)
        // Assuming we have an admin
        let admin = await adminRepo.findOne({ where: {} });
        if (!admin) {
             admin = adminRepo.create({
                name: "Test Admin",
                email: "admin@test.com",
                password: "hashedpassword",
                phone: "1234567890",
                isActive: true
            });
            await adminRepo.save(admin);
        }

        turf = turfRepo.create({
            name: "Test Turf",
            address: "Test Location", // Changed from location to address
            city: "Test City",
            state: "Test State",
            phone: "1234567890",
            openingTime: "06:00",
            closingTime: "23:00",
            status: TurfStatus.ACTIVE,
            owner: admin,
            images: [],
            amenities: [] // Changed from facilities to amenities
        });
        // Actually let's import TurfStatus
        // We need to update imports first.
        await turfRepo.save(turf);
    }
    
    // Ensure pricing exists
    const pricingService = new PricingService();
    try {
        await pricingService.createDefaultPricing(turf.id);
    } catch (e) {
        // Ignore if already exists or fails, we just want to try to ensure it's there. 
        // Actually createDefaultPricing might duplicate if not careful, let's check implementation.
        // It uses save which might insert.
        // Let's just try to get pricing first.
        try {
            await pricingService.getAllPricing(turf.id);
        } catch (notfound) {
            await pricingService.createDefaultPricing(turf.id);
        }
    }

    // Find or create a test user
    let user = await userRepo.findOne({ where: {} });
    if (!user) {
        user = userRepo.create({
            name: "Test User",
            email: "user@test.com",
            password: "hashedpassword",
            phone: "0987654321",
            isActive: true
        });
        await userRepo.save(user);
    }

    console.log(`Using Turf ID: ${turf.id}`);
    console.log(`Using User ID: ${user.id}`);

    // 2. Test Happy Path
    const date = new Date().toISOString().split('T')[0]; // Today
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    // Ensure start time is in the future if validating against now (though service doesn't seem to check "future" strictly for creation, just overlap)
    // But let's make it tomorrow to be safe against "past" checks if any exist or are added.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
    
    startTime.setDate(tomorrow.getDate());
    startTime.setHours(10, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(11, 0, 0, 0);

    console.log("Attempting to create a booking...");
    try {
        const booking = await bookingService.createBooking({
            turfId: turf.id,
            userId: user.id,
            date: tomorrowDateStr,
            startTime: startTime,
            endTime: endTime,
            creatorId: user.id,
            createdByRole: AuthRole.USER
        });
        console.log("Booking created successfully:", booking.id);
    } catch (e) {
        console.error("Failed to create booking:", e);
    }

    // 3. Test Concurrency / Overlap
    console.log("Attempting to create overlapping booking...");
    try {
        await bookingService.createBooking({
            turfId: turf.id,
            userId: user.id,
            date: tomorrowDateStr,
            startTime: startTime,
            endTime: endTime,
            creatorId: user.id,
            createdByRole: AuthRole.USER
        });
        console.error("ERROR: Overlapping booking should have failed!");
    } catch (e: any) {
        if (e.message === "Time slot already booked") {
            console.log("SUCCESS: Overlapping booking rejected correctly.");
        } else {
            console.error("Failed with unexpected error:", e);
        }
    }

    // 4. Test Concurrent Requests (Race Condition Simulation)
    console.log("Testing concurrent requests...");
    const startTime2 = new Date(startTime);
    startTime2.setHours(12, 0, 0, 0);
    const endTime2 = new Date(startTime2);
    endTime2.setHours(13, 0, 0, 0);

    const p1 = bookingService.createBooking({
        turfId: turf.id,
        userId: user.id,
        date: tomorrowDateStr,
        startTime: startTime2,
        endTime: endTime2,
        creatorId: user.id,
        createdByRole: AuthRole.USER
    });

    const p2 = bookingService.createBooking({
        turfId: turf.id,
        userId: user.id,
        date: tomorrowDateStr,
        startTime: startTime2,
        endTime: endTime2,
        creatorId: user.id,
        createdByRole: AuthRole.USER
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;

    console.log(`Concurrent results: ${fulfilled} fulfilled, ${rejected} rejected`);
    if (fulfilled === 1 && rejected === 1) {
        console.log("SUCCESS: Race condition handled correctly (one succeeded, one failed).");
    } else {
        console.error("FAILURE: Race condition not handled as expected.");
    }

  } catch (error) {
    console.error("Error during verification:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

main();
