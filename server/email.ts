import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  console.log('[Email] SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    hasPassword: !!process.env.SMTP_PASS,
  });

  return nodemailer.createTransport({
    service: "gmail",
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Campus Whisper" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .otp-code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #3b82f6; padding: 20px; background: #eff6ff; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Campus Whisper Verification</h1>
            <p>Your One-Time Password</p>
          </div>
          
          <p>Hello!</p>
          <p>You requested to register/login to Campus Whisper. Use the following OTP to verify your email:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p><strong>This code expires in 10 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>
          
          <div class="footer">
            <p>Campus Whisper - Anonymous Campus Information System</p>
            <p>Keep your identity secure. Never share your credentials.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Campus Whisper Verification Code',
    html,
    text: `Your Campus Whisper verification code is: ${otp}. This code expires in 10 minutes.`,
  });
}

export async function sendCredentialsEmail(
  email: string,
  userId: string,
  password: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .credentials { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .credential-item { margin: 15px 0; }
          .credential-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .credential-value { font-size: 18px; font-weight: bold; font-family: monospace; color: #1e40af; margin-top: 5px; }
          .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Welcome to Campus Whisper!</h1>
            <p>Your Account Has Been Created</p>
          </div>
          
          <p>Your email has been verified successfully! Here are your login credentials:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <div class="credential-label">User ID</div>
              <div class="credential-value">${userId}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ IMPORTANT - Save These Credentials!</strong>
            <ul>
              <li>Your email is <strong>NOT stored</strong> in our system for your privacy</li>
              <li>We cannot recover these credentials if you lose them</li>
              <li>Store them in a secure location</li>
              <li>Use these to login to Campus Whisper</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Campus Whisper - Anonymous Campus Information System</p>
            <p>Your identity is protected. We never store personal information.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Campus Whisper Login Credentials - Save This Email!',
    html,
    text: `Welcome to Campus Whisper! Your login credentials:\n\nUser ID: ${userId}\nPassword: ${password}\n\nIMPORTANT: Save these credentials! We cannot recover them as we don't store your email.`,
  });
}
