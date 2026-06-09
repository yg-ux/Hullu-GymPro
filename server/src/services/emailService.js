import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password
    },
  });
}

export async function sendOtpEmail(toEmail, otp, gymName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — skipping OTP email');
    return false;
  }

  const transporter = createTransport();

  await transporter.sendMail({
    from: `"Hullu Gyms" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Password Reset Code — Hullu Gyms',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:28px;color:#fff;">Hullu Gyms</h1>
          <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Password Reset</p>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">Hello${gymName ? `, ${gymName}` : ''},</p>
          <p style="margin:0 0 24px;color:#cbd5e1;">Use the code below to reset your password. It expires in <strong style="color:#fff;">15 minutes</strong>.</p>
          <div style="background:#1e293b;border:2px dashed #334155;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#60a5fa;">${otp}</span>
          </div>
          <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
          <p style="margin:0;color:#475569;font-size:12px;">© 2025 Hullu Gyms · hullugyms.com</p>
        </div>
      </div>
    `,
  });

  return true;
}
