import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1766676211464 implements MigrationInterface {
    name = 'InitialSchema1766676211464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "adminId" uuid, "refreshToken" character varying NOT NULL, "deviceName" character varying NOT NULL, "deviceType" character varying NOT NULL, "browser" character varying, "os" character varying, "ipAddress" character varying NOT NULL, "userAgent" character varying, "expiresAt" TIMESTAMP NOT NULL, "lastUsedAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_57de40bc620f456c7311aa3a1e" ON "sessions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e651728af4509875d01d70b075" ON "sessions" ("adminId") `);
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(140) NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "phone" character varying, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "turf_id" uuid NOT NULL, "user_id" uuid NOT NULL, "booking_id" uuid NOT NULL, "rating" smallint NOT NULL, "comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2c5773ff995ca1184399289d84c" UNIQUE ("user_id", "booking_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bbd6ac6e3e6a8f8c6e0e8692d6" ON "reviews" ("booking_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9409365c5a7800f2fd3ebbee4" ON "reviews" ("turf_id") `);
        await queryRunner.query(`CREATE TYPE "public"."pricing_day_type_enum" AS ENUM('weekday', 'weekend')`);
        await queryRunner.query(`CREATE TABLE "pricing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "turf_id" uuid NOT NULL, "day_type" "public"."pricing_day_type_enum", "specific_date" date, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "priority" integer NOT NULL DEFAULT '0', "name" character varying(50), "is_active" boolean NOT NULL DEFAULT true, "price" numeric(10,2) NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f6e9c88033106a989aa7ce9dee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_75e7763888a4a8c597d2d6fe2f" ON "pricing" ("turf_id", "specific_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_b537140c2958bf37a5b76a8354" ON "pricing" ("turf_id") `);
        await queryRunner.query(`CREATE TYPE "public"."turfs_status_enum" AS ENUM('active', 'inactive', 'maintenance')`);
        await queryRunner.query(`CREATE TABLE "turfs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "address" character varying NOT NULL, "city" character varying NOT NULL, "state" character varying NOT NULL, "zipCode" character varying, "latitude" numeric(10,8), "longitude" numeric(11,8), "phone" character varying NOT NULL, "images" text, "amenities" text, "status" "public"."turfs_status_enum" NOT NULL DEFAULT 'active', "opening_time" TIME NOT NULL DEFAULT '00:00:00', "closing_time" TIME NOT NULL DEFAULT '23:59:59', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ed5a2c678845e4dedeef4befecd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4655c016968a6129cec929d19b" ON "turfs" ("owner_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_53af0b6783371eb312587f4d06" ON "turfs" ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'confirmed', 'active', 'cancelled', 'completed')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "turf_id" uuid NOT NULL, "user_id" uuid NOT NULL, "date" date NOT NULL, "start_time" TIMESTAMP NOT NULL, "end_time" TIMESTAMP NOT NULL, "price" numeric(10,2) NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'pending', "created_by" text, "cancelled_at" TIMESTAMP, "cancellation_reason" text, "payment_id" text, "order_id" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_64cd97487c5c42806458ab5520" ON "bookings" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a75446f226153266937263affb" ON "bookings" ("status", "date") `);
        await queryRunner.query(`CREATE INDEX "IDX_486928bf4fa88a7f71037e9250" ON "bookings" ("turf_id", "date", "start_time", "end_time") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(140) NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "phone" character varying, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."announcements_type_enum" AS ENUM('general', 'maintenance', 'promotion', 'closure', 'tournament')`);
        await queryRunner.query(`CREATE TABLE "announcements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "turf_id" uuid, "title" character varying NOT NULL, "message" text NOT NULL, "type" "public"."announcements_type_enum" NOT NULL DEFAULT 'general', "is_active" boolean NOT NULL DEFAULT true, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f91a0094680ec190b2f2d4c873" ON "announcements" ("is_active", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_f81cb2bffedf09a4f90b658686" ON "announcements" ("turf_id") `);
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "turf_id" uuid NOT NULL, "key" character varying NOT NULL, "value" text NOT NULL, "description" text, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8bf05bdd56e34b421b7ad650c50" UNIQUE ("turf_id", "key"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_acbdcbdebd2166f63a46b10815" ON "settings" ("turf_id") `);
        await queryRunner.query(`CREATE TABLE "turf_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "turf_id" uuid NOT NULL, "booking_enabled" boolean NOT NULL DEFAULT true, "booking_disabled_reason" text, "auto_confirm_booking" boolean NOT NULL DEFAULT false, "max_booking_hours" integer NOT NULL DEFAULT '3', "advance_booking_days" integer NOT NULL DEFAULT '7', "min_booking_hours" integer NOT NULL DEFAULT '1', "cancellation_deadline_hours" integer NOT NULL DEFAULT '24', "buffer_time_minutes" integer NOT NULL DEFAULT '0', "notify_on_new_booking" boolean NOT NULL DEFAULT true, "notify_on_cancellation" boolean NOT NULL DEFAULT true, "notify_on_payment" boolean NOT NULL DEFAULT true, "reminder_before_hours" integer NOT NULL DEFAULT '2', "require_advance_payment" boolean NOT NULL DEFAULT false, "advance_payment_percentage" integer NOT NULL DEFAULT '0', "refund_enabled" boolean NOT NULL DEFAULT true, "refund_percentage" integer NOT NULL DEFAULT '100', "timezone" character varying NOT NULL DEFAULT 'Asia/Kolkata', "maintenance_mode" boolean NOT NULL DEFAULT false, "maintenance_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_87cfe8907e14a621fefdd37ba15" UNIQUE ("turf_id"), CONSTRAINT "PK_13864b74c48bd1de077ba945439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_87cfe8907e14a621fefdd37ba1" ON "turf_settings" ("turf_id") `);
        await queryRunner.query(`CREATE TABLE "owner_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "two_factor_enabled" boolean NOT NULL DEFAULT false, "two_factor_method" character varying, "session_timeout_minutes" integer NOT NULL DEFAULT '60', "email_notifications" boolean NOT NULL DEFAULT true, "sms_notifications" boolean NOT NULL DEFAULT false, "push_notifications" boolean NOT NULL DEFAULT true, "whatsapp_notifications" boolean NOT NULL DEFAULT false, "notify_new_booking" boolean NOT NULL DEFAULT true, "notify_cancellation" boolean NOT NULL DEFAULT true, "notify_payment_received" boolean NOT NULL DEFAULT true, "notify_payment_failed" boolean NOT NULL DEFAULT true, "notify_refund" boolean NOT NULL DEFAULT true, "daily_summary" boolean NOT NULL DEFAULT false, "weekly_report" boolean NOT NULL DEFAULT false, "preferred_language" character varying NOT NULL DEFAULT 'en', "notification_quiet_hours_start" TIME, "notification_quiet_hours_end" TIME, "default_auto_confirm" boolean NOT NULL DEFAULT false, "default_advance_booking_days" integer NOT NULL DEFAULT '7', "default_cancellation_deadline" integer NOT NULL DEFAULT '24', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8304fd29dfd81aa69dfbc42cca5" UNIQUE ("owner_id"), CONSTRAINT "PK_c4c30738bfd8b912089f132baf3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8304fd29dfd81aa69dfbc42cca" ON "owner_settings" ("owner_id") `);
        await queryRunner.query(`CREATE TABLE "two_factor_auth" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "secret" character varying NOT NULL, "backup_codes" text NOT NULL, "is_enabled" boolean NOT NULL DEFAULT false, "verified_at" TIMESTAMP, "last_used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_64385b800e675d22928d1e1cecf" UNIQUE ("user_id"), CONSTRAINT "PK_ac930594b4dbe3771cf16cd108d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_64385b800e675d22928d1e1cec" ON "two_factor_auth" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_e651728af4509875d01d70b0752" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_c9409365c5a7800f2fd3ebbee47" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pricing" ADD CONSTRAINT "FK_b537140c2958bf37a5b76a8354f" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "turfs" ADD CONSTRAINT "FK_4655c016968a6129cec929d19bb" FOREIGN KEY ("owner_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_83a0522441e2f8b821fdc377b40" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "announcements" ADD CONSTRAINT "FK_f81cb2bffedf09a4f90b658686d" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_acbdcbdebd2166f63a46b108153" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "turf_settings" ADD CONSTRAINT "FK_87cfe8907e14a621fefdd37ba15" FOREIGN KEY ("turf_id") REFERENCES "turfs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE VIEW "booking_details_view" AS 
    SELECT
      b.id,
      b.turf_id,
      b.user_id,
      b.date,
      b.start_time,
      b.end_time,
      b.price,
      b.status,
      b.created_by,
      b.cancelled_at,
      b.cancellation_reason,
      b.payment_id,
      b.order_id,
      b.created_at,
      b.updated_at,
      t.name AS turf_name,
      u.name AS user_name,
      u.phone AS user_phone,
      u.email AS user_email
    FROM bookings b
    LEFT JOIN turfs t ON b.turf_id = t.id
    LEFT JOIN users u ON b.user_id = u.id
  `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","VIEW","booking_details_view","SELECT\n      b.id,\n      b.turf_id,\n      b.user_id,\n      b.date,\n      b.start_time,\n      b.end_time,\n      b.price,\n      b.status,\n      b.created_by,\n      b.cancelled_at,\n      b.cancellation_reason,\n      b.payment_id,\n      b.order_id,\n      b.created_at,\n      b.updated_at,\n      t.name AS turf_name,\n      u.name AS user_name,\n      u.phone AS user_phone,\n      u.email AS user_email\n    FROM bookings b\n    LEFT JOIN turfs t ON b.turf_id = t.id\n    LEFT JOIN users u ON b.user_id = u.id"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["VIEW","booking_details_view","public"]);
        await queryRunner.query(`DROP VIEW "booking_details_view"`);
        await queryRunner.query(`ALTER TABLE "turf_settings" DROP CONSTRAINT "FK_87cfe8907e14a621fefdd37ba15"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP CONSTRAINT "FK_acbdcbdebd2166f63a46b108153"`);
        await queryRunner.query(`ALTER TABLE "announcements" DROP CONSTRAINT "FK_f81cb2bffedf09a4f90b658686d"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_83a0522441e2f8b821fdc377b40"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_64cd97487c5c42806458ab5520c"`);
        await queryRunner.query(`ALTER TABLE "turfs" DROP CONSTRAINT "FK_4655c016968a6129cec929d19bb"`);
        await queryRunner.query(`ALTER TABLE "pricing" DROP CONSTRAINT "FK_b537140c2958bf37a5b76a8354f"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_c9409365c5a7800f2fd3ebbee47"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_e651728af4509875d01d70b0752"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64385b800e675d22928d1e1cec"`);
        await queryRunner.query(`DROP TABLE "two_factor_auth"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8304fd29dfd81aa69dfbc42cca"`);
        await queryRunner.query(`DROP TABLE "owner_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_87cfe8907e14a621fefdd37ba1"`);
        await queryRunner.query(`DROP TABLE "turf_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_acbdcbdebd2166f63a46b10815"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f81cb2bffedf09a4f90b658686"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f91a0094680ec190b2f2d4c873"`);
        await queryRunner.query(`DROP TABLE "announcements"`);
        await queryRunner.query(`DROP TYPE "public"."announcements_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_486928bf4fa88a7f71037e9250"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a75446f226153266937263affb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64cd97487c5c42806458ab5520"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53af0b6783371eb312587f4d06"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4655c016968a6129cec929d19b"`);
        await queryRunner.query(`DROP TABLE "turfs"`);
        await queryRunner.query(`DROP TYPE "public"."turfs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b537140c2958bf37a5b76a8354"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_75e7763888a4a8c597d2d6fe2f"`);
        await queryRunner.query(`DROP TABLE "pricing"`);
        await queryRunner.query(`DROP TYPE "public"."pricing_day_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9409365c5a7800f2fd3ebbee4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bbd6ac6e3e6a8f8c6e0e8692d6"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e651728af4509875d01d70b075"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_57de40bc620f456c7311aa3a1e"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
    }

}
