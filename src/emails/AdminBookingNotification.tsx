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

interface AdminBookingNotificationProps {
  userName: string;
  userPhone: string;
  turfName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  paidAmount: number;
  pendingAmount: number;
  bookingId: string;
}

export const AdminBookingNotification = ({
  userName = "John Doe",
  userPhone = "+91 9876543210",
  turfName = "Sports Arena",
  bookingDate = "2026-01-15",
  startTime = "10:00 AM",
  endTime = "11:00 AM",
  paidAmount = 500,
  pendingAmount = 1000,
  bookingId = "BK123456",
}: AdminBookingNotificationProps) => {
  return (
    <Html>
      <Head />
      <Preview>New Booking: {turfName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Booking Alert 🚨</Heading>
          <Text style={text}>
            You have received a new booking for <strong>{turfName}</strong>.
          </Text>

          <Section style={section}>
            <Text style={label}>Customer Details:</Text>
            <Text style={value}>{userName}</Text>
            <Text style={value}>{userPhone}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={section}>
            <Text style={label}>Booking Details:</Text>
            <Text style={value}>Date: {bookingDate}</Text>
            <Text style={value}>Time: {startTime} - {endTime}</Text>
            <Text style={value}>Booking ID: {bookingId}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={section}>
            <Text style={label}>Payment Status:</Text>
            <Text style={value}>Paid Amount: ₹{paidAmount}</Text>
            <Text style={value}>Pending Amount: ₹{pendingAmount}</Text>
          </Section>

          <br />
          <Text style={footer}>
            This is an automated notification from NexSports.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminBookingNotification;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
  padding: "0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "center" as const,
};

const section = {
  padding: "0 24px",
};

const label = {
  color: "#666",
  fontSize: "14px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  marginTop: "16px",
  marginBottom: "8px",
};

const value = {
  color: "#333",
  fontSize: "16px",
  margin: "4px 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "20px",
};
