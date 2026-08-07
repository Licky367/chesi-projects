const nodemailer = require("nodemailer");

const hasSmtpCredentials =
  Boolean(process.env.EMAIL_USER) &&
  Boolean(process.env.EMAIL_PASS);

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : nodemailer.createTransport({
      jsonTransport: true,
    });

exports.sendResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: `"Corevester" <${process.env.EMAIL_USER || "noreply@corevester.local"}>`,
    to: email,
    subject: "Reset your Corevester password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;border:1px solid #ddd;border-radius:10px;">
        <h2 style="color:#0b5d1e;">Corevester Password Reset</h2>

        <p>You requested to reset your password.</p>

        <p>
          Click the button below to create a new password.
        </p>

        <p style="margin:30px 0;">
          <a
            href="${resetLink}"
            style="
              background:#0b5d1e;
              color:#fff;
              text-decoration:none;
              padding:12px 22px;
              border-radius:8px;
              display:inline-block;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link expires in <strong>15 minutes</strong>.
        </p>

        <p>
          If you didn't request this, you can safely ignore this email.
        </p>

        <hr>

        <small>
          Corevester
        </small>

      </div>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);

    if (!hasSmtpCredentials && result?.message) {
      console.log("📧 Password reset email preview:", result.message);
    }

    return true;
  } catch (error) {
    console.error("Reset email delivery failed:", error.message);

    console.log("📧 Password reset fallback link:", resetLink);

    return false;
  }
};