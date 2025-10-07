import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSomeColumnConstraints1759750062992 implements MigrationInterface {
    name = 'FixSomeColumnConstraints1759750062992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "city" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "state" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "phone" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "opening_time" SET DEFAULT '00:00:00'`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "closing_time" SET DEFAULT '23:59:59'`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "created_by" text`);
        await queryRunner.query(`ALTER TYPE "public"."announcements_type_enum" RENAME TO "announcements_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."announcements_type_enum" AS ENUM('general', 'maintenance', 'promotion', 'closure', 'tournament')`);
        await queryRunner.query(`ALTER TABLE "announcements" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "announcements" ALTER COLUMN "type" TYPE "public"."announcements_type_enum" USING "type"::"text"::"public"."announcements_type_enum"`);
        await queryRunner.query(`ALTER TABLE "announcements" ALTER COLUMN "type" SET DEFAULT 'general'`);
        await queryRunner.query(`DROP TYPE "public"."announcements_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."announcements_type_enum_old" AS ENUM('general', 'maintenance', 'promotion', 'closure')`);
        await queryRunner.query(`ALTER TABLE "announcements" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "announcements" ALTER COLUMN "type" TYPE "public"."announcements_type_enum_old" USING "type"::"text"::"public"."announcements_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "announcements" ALTER COLUMN "type" SET DEFAULT 'general'`);
        await queryRunner.query(`DROP TYPE "public"."announcements_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."announcements_type_enum_old" RENAME TO "announcements_type_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "closing_time" SET DEFAULT '23:00:00'`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "opening_time" SET DEFAULT '06:00:00'`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "phone" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "state" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "turfs" ALTER COLUMN "city" DROP NOT NULL`);
    }

}
