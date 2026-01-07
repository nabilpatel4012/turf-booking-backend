import cron from "node-cron";
import { AppDataSource } from "../db/data.source";
import { Booking, BookingStatus } from "../entities/booking.entity";
import { LessThanOrEqual, In } from "typeorm";
import { toZonedTime } from "date-fns-tz";

export const initBookingCleanupJob = () => {
    // Run every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        console.log("[BookingCleanupJob] Running...");
        try {
            const bookingRepo = AppDataSource.getRepository(Booking);
            
            // Get current time in IST (Asia/Kolkata)
            // This ensures we compare against the correct wall-clock time in India
            const now = new Date();
            const istTime = toZonedTime(now, "Asia/Kolkata");

            // Find bookings that are CONFIRMED and end time is in the past (using IST reference)
            // Also include 'ACTIVE' if you use that status for ongoing
            const result = await bookingRepo.update(
                {
                    status: BookingStatus.CONFIRMED,
                    endTime: LessThanOrEqual(istTime),
                },
                {
                    status: BookingStatus.COMPLETED,
                }
            );

            if (result.affected && result.affected > 0) {
                console.log(`[BookingCleanupJob] Marked ${result.affected} bookings as COMPLETED.`);
            }
        } catch (error) {
            console.error("[BookingCleanupJob] Error:", error);
        }
    });

    console.log("[BookingCleanupJob] Initialized");
};
