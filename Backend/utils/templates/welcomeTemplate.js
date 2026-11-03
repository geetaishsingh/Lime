const welcomeTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to Ideal Creation</title>
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
          padding:30px;
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
            Welcome to Ideal Creation! 🎉
          </h2>

          <p style="
            color:#4b5563;
            font-size:15px;
            line-height:1.6;
          ">
            Hello <strong>${name}</strong>,
          </p>

          <p style="
            color:#4b5563;
            font-size:15px;
            line-height:1.6;
          ">
            Your account has been successfully created and your
            email address has been verified.
          </p>

          <div style="
            margin:30px 0;
            padding:22px;
            background:#f3f4f6;
            border-radius:10px;
          ">
            <p style="
              margin:0;
              color:#111827;
              font-size:15px;
              font-weight:bold;
            ">
              Your account is ready!
            </p>

            <p style="
              margin:10px 0 0;
              color:#6b7280;
              font-size:13px;
              line-height:1.6;
            ">
              You can now log in and start exploring
              Ideal Creation.
            </p>
          </div>

          <p style="
            color:#4b5563;
            font-size:15px;
            line-height:1.6;
          ">
            We're glad to have you with us. 🚀
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

export default welcomeTemplate;