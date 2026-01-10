/**
 * Centralized Error Codes and Messages
 * 
 * Error Code Format: <CATEGORY>_<NUMBER>
 * Categories:
 * - AUTH: Authentication/Authorization errors (401, 403)
 * - VAL: Validation errors (400)
 * - NOT: Not found errors (404)
 * - CON: Conflict errors (409)
 * - SRV: Server errors (500)
 */

export enum ErrorCode {
  // Authentication errors (401, 403)
  AUTH_INVALID_CREDENTIALS = "AUTH_001",
  AUTH_USER_EXISTS = "AUTH_002",
  AUTH_ADMIN_EXISTS = "AUTH_003",
  AUTH_ACCOUNT_DEACTIVATED = "AUTH_004",
  AUTH_EMAIL_NOT_VERIFIED = "AUTH_005",
  AUTH_INVALID_REFRESH_TOKEN = "AUTH_006",
  AUTH_REFRESH_TOKEN_EXPIRED = "AUTH_007",
  AUTH_INCORRECT_PASSWORD = "AUTH_008",
  AUTH_INVALID_SESSION = "AUTH_009",
  AUTH_UNAUTHORIZED = "AUTH_010",

  // Validation errors (400)
  VAL_REQUIRED_FIELDS = "VAL_001",
  VAL_INVALID_EMAIL = "VAL_002",
  VAL_PASSWORD_LENGTH = "VAL_003",
  VAL_INVALID_RATING = "VAL_004",
  VAL_INVALID_DATE = "VAL_005",
  VAL_INVALID_TIME = "VAL_006",
  VAL_SAME_PASSWORD = "VAL_007",
  VAL_OTP_INVALID = "VAL_008",
  VAL_OTP_EXPIRED = "VAL_009",

  // Not found errors (404)
  NOT_USER = "NOT_001",
  NOT_ADMIN = "NOT_002",
  NOT_TURF = "NOT_003",
  NOT_BOOKING = "NOT_004",
  NOT_REVIEW = "NOT_005",
  NOT_ANNOUNCEMENT = "NOT_006",
  NOT_SESSION = "NOT_007",

  // Conflict errors (409)
  CON_SLOT_BOOKED = "CON_001",
  CON_ALREADY_REVIEWED = "CON_002",
  CON_ALREADY_REPORTED = "CON_003",

  // Server errors (500)
  SRV_UPLOAD_FAILED = "SRV_001",
  SRV_DELETE_FAILED = "SRV_002",
  SRV_EMAIL_FAILED = "SRV_003",
  SRV_PAYMENT_FAILED = "SRV_004",
  SRV_INTERNAL = "SRV_005",
}

export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: "Invalid email or password",
  [ErrorCode.AUTH_USER_EXISTS]: "An account with this email already exists",
  [ErrorCode.AUTH_ADMIN_EXISTS]: "An admin account with this email already exists",
  [ErrorCode.AUTH_ACCOUNT_DEACTIVATED]: "Account is deactivated. Please contact support.",
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: "Email not verified. A new verification code has been sent.",
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: "Invalid refresh token",
  [ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED]: "Refresh token expired",
  [ErrorCode.AUTH_INCORRECT_PASSWORD]: "Current password is incorrect",
  [ErrorCode.AUTH_INVALID_SESSION]: "Invalid session",
  [ErrorCode.AUTH_UNAUTHORIZED]: "Unauthorized",

  // Validation
  [ErrorCode.VAL_REQUIRED_FIELDS]: "All fields are required",
  [ErrorCode.VAL_INVALID_EMAIL]: "Invalid email format",
  [ErrorCode.VAL_PASSWORD_LENGTH]: "Password must be at least 6 characters",
  [ErrorCode.VAL_INVALID_RATING]: "Rating must be between 1 and 5",
  [ErrorCode.VAL_INVALID_DATE]: "Invalid date format",
  [ErrorCode.VAL_INVALID_TIME]: "Invalid time format",
  [ErrorCode.VAL_SAME_PASSWORD]: "New password must be different from old password",
  [ErrorCode.VAL_OTP_INVALID]: "Invalid verification code",
  [ErrorCode.VAL_OTP_EXPIRED]: "Verification code has expired",

  // Not found
  [ErrorCode.NOT_USER]: "User not found",
  [ErrorCode.NOT_ADMIN]: "Admin not found",
  [ErrorCode.NOT_TURF]: "Turf not found",
  [ErrorCode.NOT_BOOKING]: "Booking not found",
  [ErrorCode.NOT_REVIEW]: "Review not found",
  [ErrorCode.NOT_ANNOUNCEMENT]: "Announcement not found",
  [ErrorCode.NOT_SESSION]: "Session not found",

  // Conflict
  [ErrorCode.CON_SLOT_BOOKED]: "Time slot already booked",
  [ErrorCode.CON_ALREADY_REVIEWED]: "You have already reviewed this booking",
  [ErrorCode.CON_ALREADY_REPORTED]: "You have already reported this review",

  // Server
  [ErrorCode.SRV_UPLOAD_FAILED]: "Failed to upload file",
  [ErrorCode.SRV_DELETE_FAILED]: "Failed to delete file",
  [ErrorCode.SRV_EMAIL_FAILED]: "Failed to send email",
  [ErrorCode.SRV_PAYMENT_FAILED]: "Failed to process payment",
  [ErrorCode.SRV_INTERNAL]: "Internal server error",
};

export const ErrorStatusCodes: Record<ErrorCode, number> = {
  // Authentication (401, 403)
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_USER_EXISTS]: 409,
  [ErrorCode.AUTH_ADMIN_EXISTS]: 409,
  [ErrorCode.AUTH_ACCOUNT_DEACTIVATED]: 403,
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 403,
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 401,
  [ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_INCORRECT_PASSWORD]: 401,
  [ErrorCode.AUTH_INVALID_SESSION]: 401,
  [ErrorCode.AUTH_UNAUTHORIZED]: 401,

  // Validation (400)
  [ErrorCode.VAL_REQUIRED_FIELDS]: 400,
  [ErrorCode.VAL_INVALID_EMAIL]: 400,
  [ErrorCode.VAL_PASSWORD_LENGTH]: 400,
  [ErrorCode.VAL_INVALID_RATING]: 400,
  [ErrorCode.VAL_INVALID_DATE]: 400,
  [ErrorCode.VAL_INVALID_TIME]: 400,
  [ErrorCode.VAL_SAME_PASSWORD]: 400,
  [ErrorCode.VAL_OTP_INVALID]: 400,
  [ErrorCode.VAL_OTP_EXPIRED]: 400,

  // Not found (404)
  [ErrorCode.NOT_USER]: 404,
  [ErrorCode.NOT_ADMIN]: 404,
  [ErrorCode.NOT_TURF]: 404,
  [ErrorCode.NOT_BOOKING]: 404,
  [ErrorCode.NOT_REVIEW]: 404,
  [ErrorCode.NOT_ANNOUNCEMENT]: 404,
  [ErrorCode.NOT_SESSION]: 404,

  // Conflict (409)
  [ErrorCode.CON_SLOT_BOOKED]: 409,
  [ErrorCode.CON_ALREADY_REVIEWED]: 409,
  [ErrorCode.CON_ALREADY_REPORTED]: 409,

  // Server (500)
  [ErrorCode.SRV_UPLOAD_FAILED]: 500,
  [ErrorCode.SRV_DELETE_FAILED]: 500,
  [ErrorCode.SRV_EMAIL_FAILED]: 500,
  [ErrorCode.SRV_PAYMENT_FAILED]: 500,
  [ErrorCode.SRV_INTERNAL]: 500,
};

/**
 * Helper to create an AppError with standardized error code
 */
export function createAppError(code: ErrorCode, customMessage?: string) {
  const { AppError } = require("../middleware/error.middleware");
  const message = customMessage || ErrorMessages[code];
  const statusCode = ErrorStatusCodes[code];
  return new AppError(message, statusCode, code);
}
