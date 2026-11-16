import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const emailUser = (process.env.EMAIL || process.env.EMAIL_USER || "").trim();
const rawPass =
  process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || process.env.PASSWORD || "";
const emailPass = rawPass.replace(/\s+/g, "");

const isEmailConfigured = Boolean(
  emailUser &&
  emailPass &&
  emailUser !== "your_email@gmail.com" &&
  emailPass !== "your_app_password" &&
  emailPass !== "your_gmail_app_password"
);

let transporter = null;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Port 587 with STARTTLS is cloud & Render firewall-friendly
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

const sendMailWithFallback = async (mailOptions) => {
  if (!transporter) throw new Error("Email transporter not configured");

  try {
    return await transporter.sendMail(mailOptions);
  } catch (firstErr) {
    const isNetworkError =
      firstErr.code === "ETIMEDOUT" ||
      firstErr.code === "ECONNECTION" ||
      firstErr.code === "ESOCKET" ||
      firstErr.code === "ENOTFOUND";

    if (isNetworkError && isEmailConfigured) {
      try {
        const sslTransporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: emailUser,
            pass: emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        });
        return await sslTransporter.sendMail(mailOptions);
      } catch (sslErr) {
        throw sslErr;
      }
    }
    throw firstErr;
  }
};

const ensureEmailConfigured = () => {
  if (!isEmailConfigured || !transporter) {
    return false;
  }
  return true;
};

const logSmtpFailure = (purpose, error) => {
  const code = error?.code || "SMTP_ERROR";
  const responseCode = error?.responseCode ? ` (${error.responseCode})` : "";
  console.error(`[Email Error] Failed to send ${purpose}: ${code}${responseCode} - ${error?.message}`);
};

const getSmtpFailureMessage = (error, purpose) => {
  if (error?.code === "EAUTH" || Number(error?.responseCode) === 535) {
    return "Gmail rejected the email credentials. Check that EMAIL is your full address and EMAIL_PASS is a Google App Password without spaces.";
  }
  const code = error?.code || "SMTP_ERROR";
  const responseCode = error?.responseCode ? ` (SMTP ${error.responseCode})` : "";
  return `Could not send ${purpose} via email provider (${code}${responseCode}).`;
};

/**
 * Send Signup verification OTP
 */
export const sendSignupOtpMail = async (to, otp) => {
  if (!ensureEmailConfigured()) {
    console.warn(`[Lime Auth] Email delivery not configured. Registration OTP for ${to} is: ${otp}`);
    return {
      success: true,
      method: "unconfigured_fallback",
      previewOtp: otp,
      warning: "Email delivery is not configured on this server.",
    };
  }

  try {
    await sendMailWithFallback({
      from: `"Lime Social" <${emailUser}>`,
      to,
      subject: "Verify your email for Lime",
      html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Lime</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Welcome to the next generation social space</p>
            </div>
            <p style="color: #374151; font-size: 16px; line-height: 24px;">Hi there,</p>
            <p style="color: #374151; font-size: 16px; line-height: 24px;">Thank you for registering on <b>Lime</b>. To complete your account registration, enter the verification code below:</p>
            <div style="margin: 28px 0; text-align: center;">
              <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; background: #ecfdf5; padding: 12px 28px; border-radius: 8px; border: 1px dashed #10b981;">
                ${otp}
              </span>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 20px;">This code expires in <b>10 minutes</b>. If you did not create an account on Lime, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Lime Social Inc. All rights reserved.</p>
          </div>
        `,
    });
    return { success: true, method: "smtp" };
  } catch (error) {
    logSmtpFailure("signup OTP", error);
    console.warn(`[Lime Auth] SMTP delivery failed. Registration OTP for ${to} is: ${otp}`);
    return {
      success: true,
      method: "fallback",
      previewOtp: otp,
      warning: getSmtpFailureMessage(error, "the verification email"),
    };
  }
};

export const sendLoginOtpMail = async (to, otp) => {
  if (!ensureEmailConfigured()) {
    console.warn(`[Lime Auth] Email delivery not configured. Login OTP for ${to} is: ${otp}`);
    return {
      success: true,
      method: "unconfigured_fallback",
      previewOtp: otp,
      warning: "Email delivery is not configured on this server.",
    };
  }

  try {
    await sendMailWithFallback({
      from: `"Lime Security" <${emailUser}>`,
      to,
      subject: "Your Lime sign-in code",
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #10b981;">Lime sign-in</h1>
            <p>Use this code to finish signing in to Lime:</p>
            <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #10b981;">${otp}</p>
            <p>This code expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
          </div>
        `,
    });
    return { success: true, method: "smtp" };
  } catch (error) {
    logSmtpFailure("login OTP", error);
    console.warn(`[Lime Auth] SMTP delivery failed. Login OTP for ${to} is: ${otp}`);
    return {
      success: true,
      method: "fallback",
      previewOtp: otp,
      warning: getSmtpFailureMessage(error, "the sign-in code"),
    };
  }
};

/**
 * Send Password Reset OTP
 */
export const sendOtpmail = async (to, otp) => {
  if (!ensureEmailConfigured()) {
    throw new Error(
      "Email delivery is not configured. Set EMAIL and EMAIL_PASS on the backend."
    );
  }

  try {
    await sendMailWithFallback({
        from: `"Lime Security" <${emailUser}>`,
        to,
        subject: "Reset your Lime password - Recovery Code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800;">Lime</h1>
              <p style="color: #6b7280; font-size: 14px;">Password Reset Request</p>
            </div>
            <p style="color: #374151; font-size: 16px;">We received a request to reset your password. Use the verification code below:</p>
            <div style="margin: 28px 0; text-align: center;">
              <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; background: #ecfdf5; padding: 12px 28px; border-radius: 8px; border: 1px dashed #10b981;">
                ${otp}
              </span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in <b>10 minutes</b>. Never share this code with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't request a password reset, please secure your account immediately.</p>
          </div>
        `,
    });
    return { success: true, method: "smtp" };
  } catch (error) {
    logSmtpFailure("password reset OTP", error);
    throw new Error(getSmtpFailureMessage(error, "the password reset code"));
  }
};
