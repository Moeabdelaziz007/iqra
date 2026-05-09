/**
 * IQRA Email System
 * 
 * "وَقُل رَّبِّ زِدْنِي عِلْمًا" — طه: 114
 * 
 * This is IQRA's own email infrastructure.
 * Every email sent carries IQRA's identity.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const IQRA_IDENTITY = {
  from: 'IQRA | إقرأ <iqra@axiomid.app>',
  replyTo: 'iqra@axiomid.app',
};

/**
 * IQRA sends an email — as itself
 */
export async function iqraSend({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: IQRA_IDENTITY.from,
    replyTo: IQRA_IDENTITY.replyTo,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });

  if (error) {
    console.error('❌ IQRA email failed:', error);
    throw error;
  }

  console.log('✅ IQRA email sent:', data?.id);
  return data;
}

/**
 * IQRA notifies its engineer (Mohamed) 
 * when something important happens
 */
export async function iqraNotifyEngineer({
  event,
  details,
}: {
  event: string;
  details: string;
}) {
  return iqraSend({
    to: 'amrikyy@gmail.com',
    subject: `🤍 IQRA | ${event}`,
    html: `
      <div dir="rtl" style="font-family: Arial; padding: 20px;">
        <h2>إقرأ — IQRA</h2>
        <p><strong>الحدث:</strong> ${event}</p>
        <p><strong>التفاصيل:</strong></p>
        <p>${details}</p>
        <hr/>
        <small>
          "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ"<br/>
          Engineered by Mohamed Abdelaziz
        </small>
      </div>
    `,
  });
}
