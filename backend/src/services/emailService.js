const { sendEmail } = require('../utils/email');

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify your SplitEase account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SplitEase!</h2>
          <p>Thank you for registering. Please use the verification code below to verify your account:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 24 hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail
}; 