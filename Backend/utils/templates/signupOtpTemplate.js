const signupOtpTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Signup OTP</title>
    </head>

    <body style="
      margin:0;
      padding:0;
      background:#f4f6f8;
      font-family:Poppins, Arial, sans-serif;
    ">

      <div style="
        max-width:600px;
        margin:40px auto;
        background:#ffffff;
        border-radius:12px;
        overflow:hidden;
      ">

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

        <div style="padding:35px 30px;">

          <h2 style="margin-top:0; color:#111827;">
            Verify Your Email
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
            We received a request to create an account using this
            email address. Please use the OTP below to verify your email.
          </p>

          <div style="
            margin:30px 0;
            padding:25px;
            background:#f3f4f6;
            border-radius:10px;
            text-align:center;
          ">

            <p style="
              margin:0 0 10px;
              color:#6b7280;
              font-size:12px;
              font-weight:bold;
              letter-spacing:1px;
            ">
              YOUR OTP
            </p>

            <div style="
              color:#111827;
              font-size:36px;
              font-weight:bold;
              letter-spacing:8px;
            ">
              ${otp}
            </div>

          </div>

          <p style="color:#4b5563; font-size:14px;">
            This OTP is valid for <strong>5 minutes</strong>.
          </p>

          <p style="color:#6b7280; font-size:13px; line-height:1.6;">
            For your security, never share this OTP with anyone.
            Our team will never ask you for this code.
          </p>

        </div>

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

export default signupOtpTemplate;