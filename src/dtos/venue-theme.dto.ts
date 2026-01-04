import { ThemePreset } from "../entities/venue-theme.entity";

export interface UpdateVenueThemeDto {
  preset?: ThemePreset;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  layout?: string;
  font?: string;
}
