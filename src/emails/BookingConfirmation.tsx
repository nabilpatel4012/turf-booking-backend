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
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface BookingConfirmationProps {
  userName: string;
  turfName: string;
  turfAddress: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  paidAmount?: number;
  bookingId: string;
  orderId?: string;
}

export const BookingConfirmation = ({
  userName = "User",
  turfName = "Sports Arena",
  turfAddress = "123 Sports Street",
  bookingDate = "2026-01-15",
  startTime = "10:00 AM",
  endTime = "11:00 AM",
  totalAmount = 1500,
  paidAmount,
  bookingId = "BK123456",
  orderId,
}: BookingConfirmationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your booking at {turfName} is confirmed! 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>NexSports</Heading>
          </Section>

          {/* Success Banner */}
          <Section style={successBanner}>
            <Text style={successIcon}>✓</Text>
            <Heading style={successHeading}>Booking Confirmed!</Heading>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>
            <Text style={message}>
              Great news! Your booking has been successfully confirmed. Here are
              your booking details:
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
              {orderId && (
                <Column>
                  <Text style={labelText}>Order ID</Text>
                  <Text style={valueTextSmall}>{orderId}</Text>
                </Column>
              )}
            </Row>

            <Hr style={divider} />

            <Row>
              <Column>
                <Text style={labelText}>Total Amount</Text>
                <Text style={amountText}>₹{totalAmount}</Text>
              </Column>
              {paidAmount !== undefined && (
                <Column>
                  <Text style={labelText}>Paid Amount</Text>
                  <Text style={amountTextGreen}>₹{paidAmount}</Text>
                </Column>
              )}
            </Row>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Reply to this email or contact our support team.
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

export default BookingConfirmation;

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

const successBanner = {
  backgroundColor: "#22c55e",
  padding: "30px 20px",
  textAlign: "center" as const,
};

const successIcon = {
  fontSize: "48px",
  color: "#ffffff",
  margin: "0 0 10px 0",
};

const successHeading = {
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
  margin: "0 30px 30px 30px",
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

const amountText = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#18181b",
  margin: "0",
};

const amountTextGreen = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#22c55e",
  margin: "0",
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
