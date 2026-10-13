import { Resend } from "resend";
import config from "../config/config.js";

// Created on first send: the SDK throws without a key, and importing this module
// (models pull it in via the receipt helpers) must not require one.
let resend: Resend | undefined;

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}

export const sendEmail = async ({ to, subject, html, text, idempotencyKey }: MailOptions) => {
  const payload: any = {
    from: config.FROM_EMAIL,
    to,
    subject,
    html,
  };

  if (text) payload.text = text;

  const options: any = {};
  if (idempotencyKey) options.idempotencyKey = idempotencyKey;

  resend ??= new Resend(config.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(payload, options);

  if (error) {
    console.error("Resend Error Detail:", JSON.stringify(error, null, 2));
    return { success: false, error: error.message || error };
  }

  return { success: true, data };
};
