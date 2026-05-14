const nodemailer = require('nodemailer');

/**
 * Sends an OTP email via Gmail SMTP.
 * Ensure the following env vars are set:
 *   GMAIL_USER   – your Gmail address (e.g. example@gmail.com)
 *   GMAIL_PASS   – Gmail password or App Password (recommended)
 *   EMAIL_FROM   – the sender name/email shown to the user
 */
async function sendOtpEmail(to, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:500px;margin:auto;padding:20px;background:#0F172A;color:#fff;">
      <h2 style="color:#7C3AED;">Your OTP Code</h2>
      <p style="font-size:24px;letter-spacing:3px;font-weight:bold;">${otp}</p>
      <p>This code will expire in <strong>5 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
      <hr style="margin:20px 0;border-color:#1E293B;"/>
      <p style="font-size:12px;color:#bbb;">© ${new Date().getFullYear()} Sufi Perfumes – Secure Authentication</p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `Sufi Perfumes <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your Password Reset OTP',
    html,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
