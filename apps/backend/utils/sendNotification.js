import nodemailer from 'nodemailer';

/**
 * Send a branded HTML email notification.
 *
 * You can call with either:
 *  • a simple `body` string, for a one-off text email; or
 *  • a full `details` object with `items` for your HTML template.
 *
 * @param {Object} options
 * @param {string} options.to       – Recipient email address
 * @param {string} options.subject  – Email subject line
 * @param {string} [options.body]   – Plain-text body only
 * @param {Object} [options.details] – Structured content for the template
 * @param {string} [options.details.intro]    – Introductory text
 * @param {Object} [options.details.items]    – Key/value pairs to render in a table
 * @param {string} [options.details.ctaUrl]   – URL for a call-to-action button
 * @param {string} [options.details.ctaText]  – Text for the button
 * @param {string} [options.details.plainText]– Override plain-text body
 */
export const sendNotification = async ({ to, subject, body, details }) => {
  try {
    // require to & subject, and either body or a valid details.items
    if (!to || !subject || (!body && !(details && details.items))) {
      throw new Error('❌ Missing required email parameters.');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: +process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // If the caller only passed `body`, wrap it in a minimal details object
    const tpl = details && details.items
      ? details
      : { intro: '', items: {}, plainText: body };

    // Build the inline-CSS HTML template
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>${subject}</title></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
                 style="background:#fff;margin:20px 0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#1d4ed8;padding:20px;text-align:center;">
                <img src="uploads/logo.png"
                     alt="FunzaSasa" width="150" style="display:block;margin:0 auto;">
              </td>
            </tr>
            <tr>
              <td style="padding:30px;color:#333;">
                <h1 style="font-size:24px;margin-top:0;">${subject}</h1>
                <p style="font-size:16px;line-height:1.5;">
                  ${tpl.intro || 'Hello,'}
                </p>
                ${Object.keys(tpl.items).length
                  ? `<table cellpadding="5" cellspacing="0" style="width:100%;margin:20px 0;border:1px solid #ddd;">
                      ${Object.entries(tpl.items).map(([label, value]) => `
                        <tr>
                          <td style="font-weight:bold;width:30%;background:#f9f9f9;">${label}</td>
                          <td>${value}</td>
                        </tr>`).join('')}
                    </table>`
                  : `<p style="font-size:16px;line-height:1.5;">${body}</p>`
                }
                ${tpl.ctaUrl ? `
                <p style="text-align:center;margin:30px 0;">
                  <a href="${tpl.ctaUrl}"
                     style="background:#1d4ed8;color:#fff;
                            text-decoration:none;padding:12px 24px;
                            border-radius:4px;display:inline-block;
                            font-weight:bold;">
                    ${tpl.ctaText || 'Take Action'}
                  </a>
                </p>` : ''}
                <p style="font-size:14px;color:#666;">
                  If you have any questions, reply to this email or contact support@yourdomain.com.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f4f4f4;padding:20px;text-align:center;
                         font-size:12px;color:#999;">
                © ${new Date().getFullYear()} FunzaSasa. All rights reserved.<br>
                1234 Learning Way, Knowledge City<br>
                <a href="https://yourdomain.com/unsubscribe"
                   style="color:#999;text-decoration:underline;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"FunzaSasa 📚" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: tpl.plainText || [
        subject,
        ...Object.entries(tpl.items).map(([k, v]) => `${k}: ${v}`)
      ].join('\n\n'),
    });

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ Error sending email to ${to}:`, err.message);
    throw err;
  }
};
