import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface BookingCancellationProps {
  userName: string;
  turfName: string;
  turfAddress: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  bookingId: string;
  cancellationReason?: string;
  cancelledBy: "user" | "admin";
  refundAmount?: number;
}

export const BookingCancellation = ({
  userName = "User",
  turfName = "Sports Arena",
  turfAddress = "123 Sports Street",
  bookingDate = "2026-01-15",
  startTime = "10:00 AM",
  endTime = "11:00 AM",
  totalAmount = 1500,
  bookingId = "BK123456",
  cancellationReason,
  cancelledBy = "user",
  refundAmount,
}: BookingCancellationProps) => {
  const isCancelledByAdmin = cancelledBy === "admin";

  return (
    <Html>
      <Head />
      <Preview>Your booking at {turfName} has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://app.nexsports.in/android-chrome-192x192.png"
              width="48"
              height="48"
              alt="NexSports"
              style={logo}
            />
            <Heading style={logoText}>NexSports</Heading>
          </Section>

          {/* Cancellation Banner */}
          <Section style={cancelBanner}>
            <div style={cancelCircle}>
              <Text style={cancelIcon}>✕</Text>
            </div>
            <Heading style={cancelHeading}>Booking Cancelled</Heading>
            <Text style={cancelSubtext}>
              {isCancelledByAdmin
                ? "This booking has been cancelled by the venue"
                : "Your cancellation request has been processed"}
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={greeting}>Hello {userName},</Text>
            <Text style={message}>
              {isCancelledByAdmin
                ? "Your booking has been cancelled by the venue administrator. We apologize for any inconvenience."
                : "Your booking has been successfully cancelled as requested."}
            </Text>
          </Section>

          {/* Booking Details Card */}
          <Section style={detailsCard}>
            {/* Venue Details */}
            <Section style={venueSection}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={mapIcon}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <div style={venueInfo}>
                <Text style={venueName}>{turfName}</Text>
                <Text style={venueAddress}>{turfAddress}</Text>
              </div>
            </Section>

            <Hr style={divider} />

            {/* Date and Time */}
            <Section style={infoGrid}>
              <div style={infoItem}>
                <Text style={labelText}>Date</Text>
                <Text style={valueText}>{bookingDate}</Text>
              </div>
              <div style={infoItem}>
                <Text style={labelText}>Time</Text>
                <Text style={valueText}>
                  {startTime} - {endTime}
                </Text>
              </div>
            </Section>

            <Hr style={divider} />

            {/* Booking ID and Cancelled By */}
            <Section style={idSection}>
              <div style={idItem}>
                <Text style={labelText}>Booking ID</Text>
                <Text style={idText}>{bookingId}</Text>
              </div>
              <div style={idItem}>
                <Text style={labelText}>Cancelled By</Text>
                <Text style={cancelledByText}>
                  {isCancelledByAdmin ? "Venue Administrator" : "You"}
                </Text>
              </div>
            </Section>

            {cancellationReason && (
              <>
                <Hr style={divider} />
                <Section style={reasonSection}>
                  <Text style={labelText}>Cancellation Reason</Text>
                  <Text style={reasonText}>{cancellationReason}</Text>
                </Section>
              </>
            )}

            <Hr style={divider} />

            {/* Payment Details */}
            <Section style={paymentSection}>
              <div style={paymentItem}>
                <Text style={labelText}>Original Amount</Text>
                <Text style={amountTextStrike}>₹{totalAmount.toLocaleString()}</Text>
              </div>
              {refundAmount !== undefined && (
                <div style={paymentItem}>
                  <Text style={labelText}>Refund Amount</Text>
                  <Text style={refundAmountText}>₹{refundAmount.toLocaleString()}</Text>
                </div>
              )}
            </Section>
          </Section>

          {/* Refund Info Box */}
          {refundAmount !== undefined && (
            <Section style={infoBox}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={infoIcon}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <Text style={infoText}>
                Your refund of ₹{refundAmount.toLocaleString()} will be processed within 5-7 business days to your original payment method.
              </Text>
            </Section>
          )}

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              For any queries, please contact our support team.
            </Text>
            <Hr style={footerDivider} />
            <Text style={footerTextSmall}>
              © 2026 NexSports. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingCancellation;

// Styles
const main = {
  backgroundColor: "#fafafa",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "20px 0",
};

const container = {
  margin: "0 auto",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  overflow: "hidden",
};

const header = {
  backgroundColor: "#000000",
  padding: "32px 24px",
  textAlign: "center" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
};

const logo = {
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "12px",
};

const logoText = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
  display: "inline-block",
  verticalAlign: "middle",
  letterSpacing: "-0.5px",
};

const cancelBanner = {
  backgroundColor: "#ffffff",
  padding: "40px 24px",
  textAlign: "center" as const,
  borderBottom: "1px solid #e5e5e5",
};

const cancelCircle = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  backgroundColor: "#000000",
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cancelIcon = {
  fontSize: "32px",
  color: "#ffffff",
  margin: "0",
  fontWeight: "bold",
};

const cancelHeading = {
  color: "#000000",
  fontSize: "28px",
  fontWeight: "600",
  margin: "0 0 8px 0",
  letterSpacing: "-0.5px",
};

const cancelSubtext = {
  fontSize: "15px",
  color: "#737373",
  margin: "0",
  lineHeight: "1.5",
};

const content = {
  padding: "32px 24px 24px",
};

const greeting = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#000000",
  margin: "0 0 12px 0",
};

const message = {
  fontSize: "15px",
  color: "#525252",
  lineHeight: "1.6",
  margin: "0",
};

const detailsCard = {
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  margin: "0 24px 24px",
  padding: "24px",
  backgroundColor: "#fafafa",
};

const venueSection = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "4px",
};

const mapIcon = {
  color: "#000000",
  flexShrink: "0",
  marginTop: "2px",
};

const venueInfo = {
  flex: "1",
};

const venueName = {
  fontSize: "17px",
  fontWeight: "600",
  color: "#000000",
  margin: "0 0 4px 0",
  lineHeight: "1.4",
};

const venueAddress = {
  fontSize: "14px",
  color: "#737373",
  margin: "0",
  lineHeight: "1.5",
};

const divider = {
  borderColor: "#e5e5e5",
  margin: "20px 0",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const infoItem = {
  minWidth: "0",
};

const labelText = {
  fontSize: "12px",
  color: "#737373",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 6px 0",
  fontWeight: "500",
};

const valueText = {
  fontSize: "15px",
  fontWeight: "500",
  color: "#000000",
  margin: "0",
  lineHeight: "1.4",
};

const idSection = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "16px",
};

const idItem = {
  width: "100%",
};

const idText = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#000000",
  margin: "0",
  fontFamily: "Menlo, Monaco, Consolas, monospace",
  backgroundColor: "#ffffff",
  padding: "8px 12px",
  borderRadius: "4px",
  border: "1px solid #e5e5e5",
  display: "inline-block",
};

const cancelledByText = {
  fontSize: "15px",
  fontWeight: "500",
  color: "#000000",
  margin: "0",
  lineHeight: "1.4",
};

const reasonSection = {
  width: "100%",
};

const reasonText = {
  fontSize: "14px",
  color: "#525252",
  fontStyle: "italic",
  margin: "0",
  lineHeight: "1.6",
  backgroundColor: "#ffffff",
  padding: "12px",
  borderRadius: "4px",
  border: "1px solid #e5e5e5",
};

const paymentSection = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
};

const paymentItem = {
  flex: "1",
};

const amountTextStrike = {
  fontSize: "18px",
  fontWeight: "500",
  color: "#a3a3a3",
  textDecoration: "line-through",
  margin: "0",
  letterSpacing: "-0.5px",
};

const refundAmountText = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#000000",
  margin: "0",
  letterSpacing: "-0.5px",
};

const infoBox = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 24px 24px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
};

const infoIcon = {
  color: "#000000",
  flexShrink: "0",
  marginTop: "2px",
};

const infoText = {
  fontSize: "14px",
  color: "#525252",
  margin: "0",
  lineHeight: "1.6",
  flex: "1",
};

const footer = {
  padding: "32px 24px",
  textAlign: "center" as const,
  backgroundColor: "#fafafa",
  borderTop: "1px solid #e5e5e5",
};

const footerText = {
  fontSize: "14px",
  color: "#737373",
  margin: "0 0 16px 0",
  lineHeight: "1.5",
};

const footerDivider = {
  borderColor: "#e5e5e5",
  margin: "16px auto",
  maxWidth: "200px",
};

const footerTextSmall = {
  fontSize: "13px",
  color: "#a3a3a3",
  margin: "0",
};