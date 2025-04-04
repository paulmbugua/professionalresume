import nodemailer from 'nodemailer';

// Email transporter configuration using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // App password from Gmail
  },
});

// Function to send OTP via email with a modern HTML template
export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Your App Name" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your OTP Code for Password Reset',
    html: `
      <div style="
        font-family: Arial, sans-serif; 
        padding: 20px; 
        background-color: #f9f9f9; 
        text-align: center;
      ">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p style="font-size: 18px; color: #555;">
          Hello! Use the following OTP code to reset your password.
        </p>
        <div style="
          margin: 20px 0; 
          font-size: 28px; 
          font-weight: bold; 
          color: #007BFF;
          letter-spacing: 5px;
        ">
          ${otp}
        </div>
        <p style="color: #555; font-size: 14px;">
          This code is valid for <strong>10 minutes</strong>.
          Please do not share this code with anyone.
        </p>
        <p style="color: #888; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <footer style="
          margin-top: 20px; 
          font-size: 12px; 
          color: #aaa;
        ">
          © 2024 Your App Name. All Rights Reserved.
        </footer>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
};
