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
            <Img
              src="https://app.nexsports.in/android-chrome-192x192.png"
              width="48"
              height="48"
              alt="NexSports"
              style={logo}
            />
            <Heading style={logoText}>NexSports</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={heading}>Verify Your Email</Heading>
            <Text style={greeting}>Hello {userName},</Text>
            <Text style={message}>
              Thank you for registering with NexSports. Please use the
              verification code below to complete your registration:
            </Text>

            {/* OTP Box */}
            <Section style={otpContainer}>
              <Text style={otpLabel}>Verification Code</Text>
              <Text style={otpCode}>{otp}</Text>
            </Section>

            {/* Expiry Info */}
            <Section style={expiryBox}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={clockIcon}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <Text style={expiryText}>
                This code expires in {expiryMinutes} minutes
              </Text>
            </Section>

            <Hr style={divider} />

            {/* Warning Section */}
            <Section style={warningSection}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={alertIcon}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <Text style={warningText}>
                If you didn't request this code, you can safely ignore this email. Someone might have entered your email address by mistake.
              </Text>
            </Section>
          </Section>

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

export default OTPVerification;

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

const content = {
  padding: "40px 24px",
  textAlign: "center" as const,
};

const heading = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#000000",
  margin: "0 0 24px 0",
  letterSpacing: "-0.5px",
};

const greeting = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#000000",
  margin: "0 0 12px 0",
  textAlign: "left" as const,
};

const message = {
  fontSize: "15px",
  color: "#525252",
  lineHeight: "1.6",
  margin: "0 0 32px 0",
  textAlign: "left" as const,
};

const otpContainer = {
  backgroundColor: "#fafafa",
  border: "2px solid #000000",
  borderRadius: "8px",
  padding: "32px 24px",
  margin: "0 0 20px 0",
};

const otpLabel = {
  fontSize: "12px",
  color: "#737373",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px 0",
  fontWeight: "500",
};

const otpCode = {
  fontSize: "40px",
  fontWeight: "700",
  color: "#000000",
  letterSpacing: "12px",
  margin: "0",
  fontFamily: "Menlo, Monaco, Consolas, monospace",
};

const expiryBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  margin: "0 0 24px 0",
};

const clockIcon = {
  color: "#525252",
  flexShrink: "0",
};

const expiryText = {
  fontSize: "14px",
  color: "#525252",
  margin: "0",
  fontWeight: "500",
};

const divider = {
  borderColor: "#e5e5e5",
  margin: "24px 0",
};

const warningSection = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "16px",
  textAlign: "left" as const,
};

const alertIcon = {
  color: "#525252",
  flexShrink: "0",
  marginTop: "2px",
};

const warningText = {
  fontSize: "13px",
  color: "#525252",
  lineHeight: "1.6",
  margin: "0",
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