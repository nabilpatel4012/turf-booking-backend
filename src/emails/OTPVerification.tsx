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
} from "@react-email/components";
import * as React from "react";

interface OTPVerificationProps {
  userName: string;
  otp: string;
  expiryMinutes: number;
}

export const OTPVerification = ({
  userName = "User",
  otp = "123456",
  expiryMinutes = 10,
}: OTPVerificationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your NexSports verification code: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>NexSports</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={heading}>Verify Your Email</Heading>
            <Text style={greeting}>Hi {userName},</Text>
            <Text style={message}>
              Thank you for registering with NexSports! Please use the
              verification code below to complete your registration:
            </Text>

            {/* OTP Box */}
            <Section style={otpContainer}>
              <Text style={otpCode}>{otp}</Text>
            </Section>

            <Text style={expiryText}>
              ⏱️ This code expires in {expiryMinutes} minutes
            </Text>

            <Hr style={divider} />

            <Text style={warningText}>
              If you didn't request this code, you can safely ignore this email.
              Someone might have entered your email address by mistake.
            </Text>
          </Section>

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

export default OTPVerification;

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

const content = {
  backgroundColor: "#ffffff",
  padding: "40px 30px",
  textAlign: "center" as const,
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#18181b",
  margin: "0 0 20px 0",
};

const greeting = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#18181b",
  margin: "0 0 10px 0",
  textAlign: "left" as const,
};

const message = {
  fontSize: "15px",
  color: "#52525b",
  lineHeight: "1.6",
  margin: "0 0 30px 0",
  textAlign: "left" as const,
};

const otpContainer = {
  backgroundColor: "#f4f4f5",
  border: "2px dashed #22c55e",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 20px 0",
};

const otpCode = {
  fontSize: "36px",
  fontWeight: "bold",
  color: "#18181b",
  letterSpacing: "8px",
  margin: "0",
  fontFamily: "monospace",
};

const expiryText = {
  fontSize: "14px",
  color: "#71717a",
  margin: "0 0 20px 0",
};

const divider = {
  borderColor: "#e4e4e7",
  margin: "20px 0",
};

const warningText = {
  fontSize: "13px",
  color: "#a1a1aa",
  lineHeight: "1.5",
  margin: "0",
  textAlign: "left" as const,
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
