const resetPasswordTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Your Password</title>
    </head>

    <body style="
      margin:0;
      padding:0;
      background:#f4f6f8;
      font-family:Arial, Helvetica, sans-serif;
    ">

      <div style="
        max-width:600px;
        margin:40px auto;
        background:#ffffff;
        border-radius:12px;
        overflow:hidden;
      ">

        <!-- Header -->
        <div style="
          background:#111827;
          padding:25px;
          text-align:center;
        ">
          <h1 style="
            margin:0;
            color:#ffffff;
            font-size:24px;
          ">
            Ideal Creation
          </h1>
        </div>

        <!-- Content -->
        <div style="padding:35px 30px;">

          <h2 style="
            margin-top:0;
            color:#111827;
          ">
            Reset Your Password
          </h2>

          <p style="
            color:#4b5563;
            font-size:15px;
            line-height:1.6;
          ">
            Hello,
          </p>

          <p style="
            color:#4b5563;
            font-size:15px;
            line-height:1.6;
          ">
            We received a request to reset the password for your
            Ideal Creation account.
          </p>

          <p style="
            color:#4b5563;
            font-size:15px;
            line-height:1.6;
          ">
            Use the OTP below to verify your identity and create a new password.
          </p>

          <!-- OTP -->
          <div style="
            text-align:center;
            margin:30px 0;
          ">
            <div style="
              display:inline-block;
              padding:14px 28px;
              background:#111827;
              color:#ffffff;
              border-radius:8px;
              font-size:24px;
              font-weight:bold;
            ">
              ${otp}
            </div>
          </div>

          <p style="
            color:#6b7280;
            font-size:13px;
            line-height:1.6;
          ">
            This OTP will expire in
            <strong>5 minutes</strong>.
          </p>

          <p style="
            color:#6b7280;
            font-size:13px;
            line-height:1.6;
          ">
            If you didn't request a password reset, you can safely
            ignore this email.
          </p>

          <p style="
            color:#9ca3af;
            font-size:12px;
          ">
            If you didn't request a password reset, you can safely ignore this email.
          </p>

        </div>

        <!-- Footer -->
        <div style="
          background:#f9fafb;
          padding:20px;
          text-align:center;
        ">
          <p style="
            margin:0;
            color:#9ca3af;
            font-size:12px;
          ">
            © 2026 Ideal Creation. All rights reserved.
          </p>
        </div>

      </div>

    </body>
    </html>
  `;
};

export default resetPasswordTemplate;
