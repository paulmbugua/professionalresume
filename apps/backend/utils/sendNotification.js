import nodemailer from 'nodemailer';

/**
 * Send an email notification.
 * @param {Object} options - Notification details.
 * @param {string} options.to - Recipient email.
 * @param {string} options.subject - Email subject.
 * @param {string} options.body - Email content.
 * @returns {Promise<void>} - Resolves on success, throws an error otherwise.
 */
export const sendNotification = async ({ to, subject, body }) => {
  try {
    if (!to || !subject || !body) {
      throw new Error('❌ Missing required email parameters.');
    }

    // ✅ Secure transport options with environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Supports custom SMTP
      port: process.env.EMAIL_PORT || 587, // Default SMTP port (use 465 for SSL)
      secure: process.env.EMAIL_SECURE === 'true', // Use secure SMTP if needed
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"FunzaSasa" <${process.env.EMAIL_USER}>`, // Custom sender name
      to,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`, // Converts new lines to HTML
    };

    // ✅ Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error.message || error);
    throw new Error('Failed to send email.');
  }
};
