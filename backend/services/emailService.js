const axios = require('axios');
const { buildWelcomeEmail, generateVerificationEmail, generatePasswordResetEmail, generatePasswordChangedEmail, generateOTPEmail, generateInvitationEmail, generateNotificationEmail } = require('../utils/emailTemplates');

const BREVO_API_URL = 'https://api.sendinblue.com/v3/smtp/email';

function getBrevoApiKey() {
  const key = process.env.apiKey || process.env.BREVO_API_KEY;
  if (!key) {
    console.warn('[Email] Brevo API key missing (apiKey / BREVO_API_KEY). Email sending is disabled.');
    return null;
  }
  return key;
}

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

async function sendMail({ to, subject, html, text }) {
  const senderEmail = process.env.EMAIL_SENDER_EMAIL;
  const senderName = process.env.EMAIL_SENDER_NAME || 'IKIMINA-MIS';

  const recipient = sanitizeEmail(to);
  if (!recipient) {
    console.warn('[Email] Invalid recipient email', { to });
    return null;
  }

  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.warn('[Email] Brevo API key missing. Email sending is disabled.', { to, subject });
    return null;
  }

  if (!senderEmail) {
    console.warn('[Email] EMAIL_SENDER_EMAIL missing. Email sending is disabled.', { to, subject });
    return null;
  }

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: recipient }],

    subject,
    htmlContent: html,
  };
  if (text) {
    payload.textContent = text;
  }

  try {
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
    });
    const messageId = response.data?.messageId || response.data?.id || null;
    console.info('[Email] Sent', { to: recipient, subject, messageId });
    return { messageId, data: response.data };
  } catch (err) {
    const errorDetail = err.response?.data || err.message;
    console.error('[Email] Send failed', {
      to: recipient,
      subject,
      error: errorDetail,
      stack: err.stack,
    });
    return null;
  }
}

function renderTemplate(templateFn, data) {
  try {
    return templateFn(data);
  } catch (err) {
    console.error('[Email] Template rendering failed', err);
    return null;
  }
}

module.exports = {
  sendEmail: async ({ to, subject, html, text }) => sendMail({ to, subject, html, text }),
  sendWelcomeEmail: async (user, requiresApproval = false) => {
    const html = renderTemplate(buildWelcomeEmail, {
      fullName: user.fullName,
      email: user.email,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      tagline: process.env.EMAIL_TAGLINE || 'Intelligent Management Information System',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0b3b5c',
      dashboardUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL,
      requiresApproval
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: `Welcome to ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
      html
    });
  },
  sendVerificationEmail: async (user, token) => {
    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    const html = renderTemplate(generateVerificationEmail, {
      ...user,
      verificationUrl,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0f172a'
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: `Verify your email for ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
      html
    });
  },
  sendPasswordResetEmail: async (user, rawToken) => {
    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    const html = renderTemplate(generatePasswordResetEmail, {
      ...user,
      resetUrl,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0f172a'
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: `Reset your ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'} password`,
      html
    });
  },
  sendPasswordChangedEmail: async (user) => {
    const html = renderTemplate(generatePasswordChangedEmail, {
      ...user,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0f172a'
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: `Password changed for ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
      html
    });
  },
  sendOTPEmail: async (user, otp) => {
    const html = renderTemplate(generateOTPEmail, {
      ...user,
      otp,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0f172a'
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: `Your ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'} OTP code`,
      html
    });
  },
  sendInvitationEmail: async (user, inviteUrl) => {
    const html = renderTemplate(generateInvitationEmail, {
      ...user,
      inviteUrl,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: `You have been invited to ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
      html
    });
  },
  sendNotificationEmail: async (user, { title, message }) => {
    const html = renderTemplate(generateNotificationEmail, {
      ...user,
      title,
      message,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0f172a'
    });
    if (!html) return null;
    return sendMail({
      to: user.email,
      subject: title || `Notification from ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
      html
    });
  },
  sendWelcomeAndVerificationEmail: async (user, token) => {
    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    const welcomeHtml = renderTemplate(buildWelcomeEmail, {
      fullName: user.fullName,
      email: user.email,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      tagline: process.env.EMAIL_TAGLINE || 'Intelligent Management Information System',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0b3b5c',
      dashboardUrl: baseUrl,
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL,
      requiresApproval: false
    });
    const verificationHtml = renderTemplate(generateVerificationEmail, {
      ...user,
      verificationUrl,
      companyName: process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS',
      primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#0f172a'
    });
    if (!welcomeHtml && !verificationHtml) return null;
    const results = [];
    if (welcomeHtml) {
      const welcomeResult = await sendMail({
        to: user.email,
        subject: `Welcome to ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
        html: welcomeHtml
      });
      results.push(welcomeResult);
    }
    if (verificationHtml) {
      const verificationResult = await sendMail({
        to: user.email,
        subject: `Verify your email for ${process.env.EMAIL_COMPANY_NAME || 'IKIMINA-MIS'}`,
        html: verificationHtml
      });
      results.push(verificationResult);
    }
    return results.some(Boolean) ? results : null;
  }
};

