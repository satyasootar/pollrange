import { Resend } from "resend";
import config from "../config/config.js";

const resend = new Resend(config.RESEND_API_KEY);

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export const sendEmail = async ({ to, subject, html, text, idempotencyKey }: MailOptions) => {
  const { data, error } = await resend.emails.send({
    from: config.FROM_EMAIL,
    to,
    subject,
    html,
    text,
    idempotencyKey,
  });

  if (error) {
    console.error("Resend Error:", error);
    return { success: false, error };
  }

  return { success: true, data };
};
