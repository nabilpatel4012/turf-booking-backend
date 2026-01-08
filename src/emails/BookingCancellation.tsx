import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
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
      <Preview>
        Your booking at {turfName} has been cancelled
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>NexSports</Heading>
          </Section>

          {/* Cancellation Banner */}
          <Section style={cancelBanner}>
            <Text style={cancelIcon}>✕</Text>
            <Heading style={cancelHeading}>Booking Cancelled</Heading>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>
            <Text style={message}>
              {isCancelledByAdmin
                ? "Your booking has been cancelled by the venue administrator."
                : "Your booking has been successfully cancelled as per your request."}
            </Text>
          </Section>

          {/* Booking Details Card */}
          <Section style={detailsCard}>
            <Text style={cardTitle}>📍 {turfName}</Text>
            <Text style={cardAddress}>{turfAddress}</Text>
            <Hr style={divider} />

            <Row>
              <Column>
                <Text style={labelText}>Date</Text>
                <Text style={valueText}>{bookingDate}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Time</Text>
                <Text style={valueText}>
                  {startTime} - {endTime}
                </Text>
              </Column>
            </Row>

            <Hr style={divider} />

            <Row>
              <Column>
                <Text style={labelText}>Booking ID</Text>
                <Text style={valueTextSmall}>{bookingId}</Text>
              </Column>
              <Column>
                <Text style={labelText}>Cancelled By</Text>
                <Text style={valueText}>
                  {isCancelledByAdmin ? "Venue Admin" : "You"}
                </Text>
              </Column>
            </Row>

            {cancellationReason && (
              <>
                <Hr style={divider} />
                <Text style={labelText}>Cancellation Reason</Text>
                <Text style={reasonText}>{cancellationReason}</Text>
              </>
            )}

            <Hr style={divider} />

            <Row>
              <Column>
                <Text style={labelText}>Original Amount</Text>
                <Text style={amountTextStrike}>₹{totalAmount}</Text>
              </Column>
              {refundAmount !== undefined && (
                <Column>
                  <Text style={labelText}>Refund Amount</Text>
                  <Text style={amountTextGreen}>₹{refundAmount}</Text>
                </Column>
              )}
            </Row>
          </Section>

          {/* Info Box */}
          {refundAmount !== undefined && (
            <Section style={infoBox}>
              <Text style={infoText}>
                💰 Your refund of ₹{refundAmount} will be processed within 5-7
                business days to your original payment method.
              </Text>
            </Section>
          )}

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need help? Reply to this email or contact our support team.
            </Text>
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
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0",
  maxWidth: "580px",
};

const header = {
  backgroundColor: "#18181b",
  padding: "20px",
  textAlign: "center" as const,
  borderRadius: "12px 12px 0 0",
};

const logoText = {
  color: "#22c55e",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
};

const cancelBanner = {
  backgroundColor: "#ef4444",
  padding: "30px 20px",
  textAlign: "center" as const,
};

const cancelIcon = {
  fontSize: "48px",
  color: "#ffffff",
  margin: "0 0 10px 0",
};

const cancelHeading = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "30px",
};

const greeting = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#18181b",
  margin: "0 0 10px 0",
};

const message = {
  fontSize: "15px",
  color: "#52525b",
  lineHeight: "1.6",
  margin: "0",
};

const detailsCard = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "12px",
  padding: "24px",
  margin: "0 30px 20px 30px",
};

const cardTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#18181b",
  margin: "0 0 4px 0",
};

const cardAddress = {
  fontSize: "14px",
  color: "#71717a",
  margin: "0",
};

const divider = {
  borderColor: "#e4e4e7",
  margin: "16px 0",
};

const labelText = {
  fontSize: "12px",
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const valueText = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#18181b",
  margin: "0",
};

const valueTextSmall = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#18181b",
  margin: "0",
  fontFamily: "monospace",
};

const reasonText = {
  fontSize: "14px",
  color: "#52525b",
  fontStyle: "italic",
  margin: "0",
};

const amountTextStrike = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#a1a1aa",
  textDecoration: "line-through",
  margin: "0",
};

const amountTextGreen = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#22c55e",
  margin: "0",
};

const infoBox = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fbbf24",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 30px 20px 30px",
};

const infoText = {
  fontSize: "14px",
  color: "#92400e",
  margin: "0",
  lineHeight: "1.5",
};

const footer = {
  backgroundColor: "#f4f4f5",
  padding: "30px",
  textAlign: "center" as const,
  borderRadius: "0 0 12px 12px",
};

const footerText = {
  fontSize: "14px",
  color: "#71717a",
  margin: "0 0 10px 0",
};

const footerTextSmall = {
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0",
};
