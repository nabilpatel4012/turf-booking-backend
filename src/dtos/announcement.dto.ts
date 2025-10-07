import { AnnouncementType } from "../entities/announcement.entity";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
} from "class-validator";

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsUUID()
  turfId?: string;

  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  message?: string;

  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetAnnouncementsQueryDto {
  @IsOptional()
  @IsUUID()
  turfId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
