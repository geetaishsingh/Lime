import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Credentials & Provider Detection
// ─────────────────────────────────────────────────────────────────────────────
const emailUser = (process.env.EMAIL || process.env.EMAIL_USER || "").trim();
const rawPass =
  process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || process.env.PASSWORD || "";
const emailPass = rawPass.replace(/\s+/g, "");

const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
const brevoApiKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim();

const isResendConfigured = Boolean(
  resendApiKey && resendApiKey !== "your_resend_api_key"
);

const isBrevoConfigured = Boolean(
  brevoApiKey && brevoApiKey !== "your_brevo_api_key"
);

const isGmailConfigured = Boolean(
  emailUser &&
  emailPass &&
  emailUser !== "your_email@gmail.com" &&
  emailPass !== "your_app_password" &&
  emailPass !== "your_gmail_app_password"
);

// ─────────────────────────────────────────────────────────────────────────────
// Resend Client
// ─────────────────────────────────────────────────────────────────────────────
let resendClient = null;
if (isResendConfigured) {
  try {
    resendClient = new Resend(resendApiKey);
    console.log("[Lime Mail] Resend HTTP API configured.");
  } catch (err) {
    console.error("[Lime Mail] Failed to initialize Resend client:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gmail SMTP Transporter (Fallback for local dev with IPv4 forced)
// ─────────────────────────────────────────────────────────────────────────────
let gmailTransporter = null;
if (!isResendConfigured && !isBrevoConfigured && isGmailConfigured) {
  gmailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Port 587 uses STARTTLS
    family: 4, // Force IPv4 to avoid ENETUNREACH on cloud hosts without IPv6
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  console.log("[Lime Mail] Gmail SMTP configured with IPv4.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Sender Configuration
// ─────────────────────────────────────────────────────────────────────────────
const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL || "Lime <onboarding@resend.dev>";

const BREVO_FROM_EMAIL =
  process.env.BREVO_FROM_EMAIL || emailUser || "noreply@lime.com";
const BREVO_FROM_NAME = "Lime";

// Check if email sending is supported by at least one provider
export const isAnyEmailConfigured = () =>
  isResendConfigured || isBrevoConfigured || isGmailConfigured;

// ─────────────────────────────────────────────────────────────────────────────
// Unified Send Dispatcher (HTTPS API preferred, SMTP as local fallback)
// ─────────────────────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, purpose = "email" }) => {
  // 1. Try Resend HTTPS API (Preferred in production)
  if (isResendConfigured && resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: RESEND_FROM,
        to,
        subject,
        html,
      });

      if (result.error) {
        throw new Error(`Resend error: ${result.error.message || JSON.stringify(result.error)}`);
      }
      return { success: true, method: "resend", data: result };
    } catch (err) {
      console.error(`[Email Error] Resend failed for ${purpose}:`, err?.message);
      // If Brevo or Gmail also configured, continue to try them
      if (!isBrevoConfigured && !isGmailConfigured) throw err;
    }
  }

  // 2. Try Brevo HTTPS API (Works without domain verification, 300 free/day)
  if (isBrevoConfigured) {
    try {
      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!brevoResponse.ok) {
        const errBody = await brevoResponse.json().catch(() => ({}));
        throw new Error(
          `Brevo API error (${brevoResponse.status}): ${
            errBody.message || brevoResponse.statusText
          }`
        );
      }

      return { success: true, method: "brevo" };
    } catch (err) {
      console.error(`[Email Error] Brevo failed for ${purpose}:`, err?.message);
      if (!isGmailConfigured) throw err;
    }
  }

  // 3. Try Gmail SMTP (Local dev fallback with IPv4)
  if (isGmailConfigured && gmailTransporter) {
    try {
      await gmailTransporter.sendMail({
        from: `"Lime" <${emailUser}>`,
        to,
        subject,
        html,
      });
      return { success: true, method: "smtp" };
    } catch (smtpErr) {
      // If port 587 failed with network/socket error, try port 465 SSL once
      const isNetError =
        smtpErr.code === "ETIMEDOUT" ||
        smtpErr.code === "ESOCKET" ||
        smtpErr.code === "ECONNECTION" ||
        smtpErr.code === "ENETUNREACH";

      if (isNetError) {
        try {
          const sslTransporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            family: 4, // Force IPv4
            auth: { user: emailUser, pass: emailPass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 12000,
            socketTimeout: 15000,
          });
          await sslTransporter.sendMail({
            from: `"Lime" <${emailUser}>`,
            to,
            subject,
            html,
          });
          return { success: true, method: "smtp_ssl" };
        } catch (sslErr) {
          throw sslErr;
        }
      }
      throw smtpErr;
    }
  }

  throw new Error(
    "No email service configured. Set RESEND_API_KEY (recommended) or BREVO_API_KEY on Render."
  );
};

const getMailFailureMessage = (error, purpose) => {
  if (error?.code === "EAUTH" || Number(error?.responseCode) === 535) {
    return "Email credentials rejected. Check your email password / App Password.";
  }
  if (error?.code === "ENETUNREACH" || error?.code === "ETIMEDOUT") {
    return "Outbound SMTP connection timed out. On Render, please add RESEND_API_KEY or BREVO_API_KEY.";
  }
  const code = error?.code || "EMAIL_SERVICE_ERROR";
  return `Could not deliver ${purpose} (${code}: ${error?.message || "provider unreachable"}).`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public Email Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send Signup verification OTP
 */
export const sendSignupOtpMail = async (to, otp) => {
  if (!isAnyEmailConfigured()) {
    console.warn(`[Lime Auth] No email service configured. Registration OTP for ${to}: ${otp}`);
    return {
      success: true,
      method: "unconfigured_fallback",
      previewOtp: otp,
      warning: "Email delivery is not configured on this server.",
    };
  }

  try {
    const res = await sendMail({
      to,
      subject: "Verify your email for Lime",
      purpose: "signup OTP",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#84cc16;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Lime</h1>
            <p style="color:#6b7280;font-size:14px;margin-top:4px;">Welcome to the next generation social space</p>
          </div>
          <p style="color:#374151;font-size:16px;line-height:24px;">Hi there,</p>
          <p style="color:#374151;font-size:16px;line-height:24px;">Thank you for registering on <b>Lime</b>. Enter the verification code below to verify your email:</p>
          <div style="margin:28px 0;text-align:center;">
            <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:8px;color:#84cc16;background:#f0fdf4;padding:12px 28px;border-radius:8px;border:1px dashed #84cc16;">
              ${otp}
            </span>
          </div>
          <p style="color:#6b7280;font-size:14px;line-height:20px;">This code expires in <b>10 minutes</b>. If you did not create a Lime account, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">&copy; ${new Date().getFullYear()} Lime Social. All rights reserved.</p>
        </div>
      `,
    });
    return { success: true, method: res.method };
  } catch (error) {
    console.error(`[Email Error] Failed to send signup OTP:`, error);
    console.warn(`[Lime Auth] Email failed. Registration OTP for ${to}: ${otp}`);
    return {
      success: true,
      method: "fallback",
      previewOtp: otp,
      warning: getMailFailureMessage(error, "the verification email"),
    };
  }
};

/**
 * Send Login OTP
 */
export const sendLoginOtpMail = async (to, otp) => {
  if (!isAnyEmailConfigured()) {
    console.warn(`[Lime Auth] No email service configured. Login OTP for ${to}: ${otp}`);
    return {
      success: true,
      method: "unconfigured_fallback",
      previewOtp: otp,
      warning: "Email delivery is not configured on this server.",
    };
  }

  try {
    const res = await sendMail({
      to,
      subject: "Your Lime sign-in code",
      purpose: "login OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h1 style="color:#84cc16;">Lime sign-in</h1>
          <p>Use this code to finish signing in to Lime:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#84cc16;">${otp}</p>
          <p>This code expires in 10 minutes. If you did not try to sign in, ignore this email.</p>
        </div>
      `,
    });
    return { success: true, method: res.method };
  } catch (error) {
    console.error(`[Email Error] Failed to send login OTP:`, error);
    console.warn(`[Lime Auth] Email failed. Login OTP for ${to}: ${otp}`);
    return {
      success: true,
      method: "fallback",
      previewOtp: otp,
      warning: getMailFailureMessage(error, "the sign-in code"),
    };
  }
};

/**
 * Send Password Reset OTP
 */
export const sendOtpmail = async (to, otp) => {
  // If no email provider is configured at all
  if (!isAnyEmailConfigured()) {
    const isDevOrPreview =
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_OTP_PREVIEW === "true";

    if (isDevOrPreview) {
      console.warn(`[Lime Auth] Email unconfigured. Reset OTP for ${to}: ${otp}`);
      return {
        success: true,
        method: "unconfigured_fallback",
        previewOtp: otp,
        warning: "Email delivery is not configured. Set RESEND_API_KEY on Render.",
      };
    }

    throw new Error(
      "Email delivery is not configured. Please set RESEND_API_KEY (recommended) or BREVO_API_KEY on the backend."
    );
  }

  try {
    const res = await sendMail({
      to,
      subject: "Reset your Lime password - Recovery Code",
      purpose: "password reset OTP",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#84cc16;margin:0;font-size:28px;font-weight:800;">Lime</h1>
            <p style="color:#6b7280;font-size:14px;">Password Reset Request</p>
          </div>
          <p style="color:#374151;font-size:16px;">We received a request to reset your Lime account password. Use the verification code below:</p>
          <div style="margin:28px 0;text-align:center;">
            <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:8px;color:#84cc16;background:#f0fdf4;padding:12px 28px;border-radius:8px;border:1px dashed #84cc16;">
              ${otp}
            </span>
          </div>
          <p style="color:#6b7280;font-size:14px;">This code will expire in <b>10 minutes</b>. Never share this code with anyone.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;text-align:center;">If you didn't request a password reset, please secure your account immediately.</p>
        </div>
      `,
    });
    return { success: true, method: res.method };
  } catch (error) {
    console.error(`[Email Error] Failed to send password reset OTP:`, error);

    // If preview / fallback is permitted
    const isDevOrPreview =
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_OTP_PREVIEW === "true";

    if (isDevOrPreview) {
      console.warn(`[Lime Auth] SMTP/API delivery failed. Reset OTP for ${to}: ${otp}`);
      return {
        success: true,
        method: "fallback",
        previewOtp: otp,
        warning: getMailFailureMessage(error, "the password reset code"),
      };
    }

    throw new Error(getMailFailureMessage(error, "the password reset code"));
  }
};
