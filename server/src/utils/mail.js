import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const isEmailConfigured = Boolean(
  process.env.EMAIL &&
  process.env.PASSWORD &&
  process.env.EMAIL !== "your_email@gmail.com" &&
  process.env.PASSWORD !== "your_app_password"
);

let transporter = null;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: "Gmail",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
}

/**
 * Send Signup verification OTP
 */
export const sendSignupOtpMail = async (to, otp) => {
  if (isEmailConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: `"Lime Social" <${process.env.EMAIL}>`,
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
    } catch (err) {
      console.error("[Email Error] Failed to send via SMTP:", err.message);
      // Fallback to console
      console.log(`\n======================================================`);
      console.log(`[LIME DEV EMAIL FALLBACK] SIGNUP OTP for ${to}: ${otp}`);
      console.log(`======================================================\n`);
      return { success: true, method: "dev_fallback" };
    }
  } else {
    // Development fallback
    console.log(`\n======================================================`);
    console.log(`[LIME DEV EMAIL FALLBACK] SIGNUP OTP for ${to}: ${otp}`);
    console.log(`======================================================\n`);
    return { success: true, method: "dev_fallback" };
  }
};

/**
 * Send Password Reset OTP
 */
export const sendOtpmail = async (to, otp) => {
  if (isEmailConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: `"Lime Security" <${process.env.EMAIL}>`,
        to,
        subject: "Reset your Lime password",
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
    } catch (err) {
      console.error("[Email Error] Failed to send via SMTP:", err.message);
      console.log(`\n======================================================`);
      console.log(`[LIME DEV EMAIL FALLBACK] RESET OTP for ${to}: ${otp}`);
      console.log(`======================================================\n`);
      return { success: true, method: "dev_fallback" };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[LIME DEV EMAIL FALLBACK] RESET OTP for ${to}: ${otp}`);
    console.log(`======================================================\n`);
    return { success: true, method: "dev_fallback" };
  }
};
