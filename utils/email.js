import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

// Send OTP email
export const sendOTPEmail = async (to, otp, username) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"IronWall Security" <${process.env.EMAIL_FROM}>`,
        to: to,
        subject: '🔐 IronWall - Verify Your Email',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 16px; border-radius: 16px; margin-bottom: 20px;">
                                <span style="font-size: 32px;">🛡️</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">IronWall Security</h1>
                            <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 14px;">Vulnerability Research Platform</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 22px;">Hello ${username || 'Researcher'}! 👋</h2>
                            <p style="color: #d1d5db; margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                                Welcome to IronWall! To complete your registration and secure your account, please use the verification code below:
                            </p>
                            
                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #1e1e2f 0%, #252540 100%); border: 2px solid #6366f1; border-radius: 12px; padding: 30px; text-align: center; margin: 24px 0;">
                                <p style="color: #a1a1aa; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                                <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #6366f1; font-family: 'Courier New', monospace;">
                                    ${otp}
                                </div>
                                <p style="color: #71717a; margin: 16px 0 0; font-size: 12px;">
                                    ⏱️ This code expires in 10 minutes
                                </p>
                            </div>
                            
                            <p style="color: #9ca3af; margin: 24px 0 0; font-size: 14px; line-height: 1.6;">
                                If you didn't request this verification code, please ignore this email. Your account security is important to us.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);">
                            <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
                                © 2025 IronWall Security. All rights reserved.<br>
                                <span style="color: #4b5563;">This is an automated message. Please do not reply.</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
        text: `
IronWall Security - Email Verification

Hello ${username || 'Researcher'}!

Welcome to IronWall! To complete your registration, please use the verification code below:

Your Verification Code: ${otp}

This code expires in 10 minutes.

If you didn't request this verification code, please ignore this email.

© 2025 IronWall Security. All rights reserved.
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error.message);
        throw error;
    }
};

// Verify SMTP connection
export const verifyEmailConnection = async () => {
    const transporter = createTransporter();
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified');
        return true;
    } catch (error) {
        console.error('❌ SMTP connection failed:', error.message);
        return false;
    }
};
