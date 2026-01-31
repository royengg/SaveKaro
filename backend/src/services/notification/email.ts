import { Resend } from "resend";
import logger from "../../lib/logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "deals@dealhunt.app";

const resend = new Resend(RESEND_API_KEY);

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// Send a single email
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set, skipping email");
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      logger.error({ error }, "Failed to send email");
      return false;
    }

    logger.info({ emailId: data?.id, to: options.to }, "Email sent");
    return true;
  } catch (error) {
    logger.error({ error }, "Failed to send email");
    return false;
  }
}

// Email templates
export function generateDealAlertEmail(
  userName: string,
  deals: Array<{ title: string; dealPrice: number; discountPercent: number; productUrl: string }>
): string {
  const dealRows = deals
    .map(
      (deal) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <a href="${deal.productUrl}" style="color: #7c3aed; text-decoration: none; font-weight: 500;">
            ${deal.title}
          </a>
          <br>
          <span style="color: #059669; font-weight: bold;">₹${deal.dealPrice.toLocaleString()}</span>
          ${deal.discountPercent ? `<span style="color: #dc2626; margin-left: 8px;">${deal.discountPercent}% OFF</span>` : ""}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔥 New Deals Alert!</h1>
        </div>
        <div style="padding: 24px;">
          <p style="color: #374151; margin-bottom: 20px;">
            Hey ${userName}! We found some deals matching your preferences:
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            ${dealRows}
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" 
               style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              View All Deals
            </a>
          </div>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>You're receiving this because you enabled deal alerts on DealHunt.</p>
          <a href="${process.env.FRONTEND_URL}/settings" style="color: #7c3aed;">Manage preferences</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateWelcomeEmail(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to DealHunt! 🎉</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hey ${userName}!
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Welcome to DealHunt – your one-stop destination for the best deals from across the internet. 
            We curate deals from Reddit's r/dealsforindia and let our community upvote the best ones.
          </p>
          <h3 style="color: #1f2937; margin-top: 24px;">Here's what you can do:</h3>
          <ul style="color: #374151; line-height: 1.8;">
            <li>🔍 Browse and search deals by category</li>
            <li>❤️ Save deals for later</li>
            <li>⬆️ Upvote the best deals</li>
            <li>💬 Comment and discuss deals</li>
            <li>🔔 Get notified about new deals matching your preferences</li>
            <li>📝 Submit your own deals</li>
          </ul>
          <div style="margin-top: 32px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" 
               style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Start Browsing Deals
            </a>
          </div>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>Made with ❤️ by DealHunt</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  sendEmail,
  generateDealAlertEmail,
  generateWelcomeEmail,
};
