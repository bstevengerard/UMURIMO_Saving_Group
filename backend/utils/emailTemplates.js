// function escapeAttr(str) {
//   return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// }

// function buildWelcomeEmail({ fullName, dashboardUrl = '', companyName = 'IKIMINA-MISNA-MIS', tagline = 'Intelligent Management Information System', primaryColor = '#0b3b5c', supportEmail = '', requiresApproval = false }) {
//   const name = escapeAttr(fullName || 'Member');
//   const safeCompany = escapeAttr(companyName);
//   const safeTagline = escapeAttr(tagline);
//   const safeSupport = escapeAttr(supportEmail);
//   const safeDashboard = escapeAttr(dashboardUrl);
//   const safePrimary = escapeAttr(primaryColor || '#0b3b5c');
//   return `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>Welcome to ${safeCompany}</title>
//   <style>
//     body { margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
//     .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
//     .header { background: linear-gradient(135deg, ${safePrimary}, ${safePrimary}cc); padding: 32px 28px; text-align: center; }
//     .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.3px; }
//     .header p { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 16px; font-weight: 400; }
//     .content { padding: 40px 32px 32px; color: #1e293b; }
//     .content h2 { font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: ${safePrimary}; }
//     .content p { font-size: 16px; line-height: 1.6; margin: 0 0 20px; color: #334155; }
//     .highlight { background: #f0f7ff; border-left: 4px solid ${safePrimary}; padding: 16px 20px; border-radius: 6px; margin-bottom: 28px; }
//     .highlight p { margin: 0; font-size: 15px; }
//     .cta-button { display: inline-block; background: ${safePrimary}; color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 40px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(11,59,92,0.25); }
//     .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 14px; color: #94a3b8; border-top: 1px solid #e9edf2; }
//     .footer a { color: ${safePrimary}; text-decoration: none; }
//     @media (max-width: 480px) { .content { padding: 28px 20px; } .header { padding: 24px 20px; } .header h1 { font-size: 24px; } }
//   </style>
// </head>
// <body>
//   <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa; padding:30px 0;">
//     <tr>
//       <td align="center">
//         <div class="container">
//           <div class="header">
//             <h1>${safeCompany}</h1>
//             <p>${safeTagline}</p>
//           </div>
//           <div class="content">
//             <h2>Welcome aboard, ${name}!</h2>
//             <p>We are thrilled to have you join the <strong>${safeCompany}</strong> community. Your account has been successfully set up, and you now have access to a suite of powerful tools designed to streamline your workflows and boost productivity.</p>
//             ${requiresApproval ? `<div class="highlight" style="border-left-color:#f59e0b;background:#fffdf5;"><p><strong>Account Approval:</strong> Your account is pending admin approval. You will be able to log in once an administrator reviews and approves your registration. Thank you for your patience.</p></div>` : ''}
//             <div class="highlight">
//               <p><strong>Quick start:</strong> Log in to your dashboard to explore real-time analytics, manage your projects, and collaborate with your team. We're here to support you every step of the way.</p>
//             </div>
//             <p style="text-align:center; margin: 30px 0 10px;"><a href="${safeDashboard || '#'}" class="cta-button">Go to Dashboard</a></p>
//             <p style="font-size:15px; color:#475569; margin-top:30px;">If you have any questions, simply reply to this email or reach out to our support team at ${safeSupport ? `<a href="mailto:mailto:${safeSupport}" style="color:${safePrimary};">${safeSupport}</a>` : 'our support team'}.</p>
//           </div>
//           <div class="footer"> &copy; 2026 ${safeCompany} &middot; Built with <span style="color:#e74c3c;">&hearts;</span> for excellence<br>${safeSupport ? `<a href="mailto:mailto:${safeSupport}">Contact Support</a> &middot; ` : ''}<a href="#">Privacy Policy</a> &middot; <a href="#">Terms of Service</a> </div>
//         </div>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// function generateVerificationEmail({ fullName, verificationUrl, companyName = 'IKIMINA-MISNA-MIS', primaryColor = '#0f172a' }) {
//   const name = escapeAttr(fullName || 'Member');
//   const safeCompany = escapeAttr(companyName);
//   const safePrimary = escapeAttr(primaryColor || '#0f172a');
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>Verify your email</title>
// </head>
// <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
//     <tr>
//       <td style="background:#ffffff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
//         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//           <tr>
//             <td style="text-align:center;padding-bottom:18px;">
//               <h1 style="margin:0;font-size:22px;color:${safePrimary};">Verify your email</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="font-size:15px;line-height:1.6;color:#334155;">
//               <p style="margin:0 0 12px">Hi <strong style="color:#0f172a;">${name}</strong>,</p>
//               <p style="margin:0 0 14px;">Click the button below to verify your email address for <strong style="color:${safePrimary};">${safeCompany}</strong>.</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding:6px 0 14px;">
//               <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
//                 <tr>
//                   <td style="background:${safePrimary};border-radius:8px;">
//                     <a href="${escapeAttr(String(verificationUrl || ''))}" style="display:inline-block;padding:10px 20px;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;">Verify Email</a>
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding-top:14px;border-top:1px solid #eef0f3;">
//               <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;text-align:center;">${safeCompany} &bull; Built for members</p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// function generatePasswordResetEmail({ fullName, resetUrl, companyName = 'IKIMINA-MISNA-MIS', primaryColor = '#0f172a' }) {
//   const name = escapeAttr(fullName || 'Member');
//   const safeCompany = escapeAttr(companyName);
//   const safePrimary = escapeAttr(primaryColor || '#0f172a');
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>Reset your password</title>
// </head>
// <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
//     <tr>
//       <td style="background:#ffffff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
//         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//           <tr>
//             <td style="text-align:center;padding-bottom:18px;">
//               <h1 style="margin:0;font-size:22px;color:${safePrimary};">Reset your password</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="font-size:15px;line-height:1.6;color:#334155;">
//               <p style="margin:0 0 12px">Hi <strong style="color:#0f172a;">${name}</strong>,</p>
//               <p style="margin:0 0 14px;">You requested a password reset for <strong style="color:${safePrimary};">${safeCompany}</strong>. Click the button below to choose a new password.</p>
//               <p style="margin:0 0 14px;color:#ef4444;font-size:13px;">This link expires in 1 hour.</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding:6px 0 14px;">
//               <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
//                 <tr>
//                   <td style="background:${safePrimary};border-radius:8px;">
//                     <a href="${escapeAttr(String(resetUrl || ''))}" style="display:inline-block;padding:10px 20px;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;">Reset Password</a>
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding-top:14px;border-top:1px solid #eef0f3;">
//               <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;text-align:center;">${safeCompany} &bull; Built for members</p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// function generatePasswordChangedEmail({ fullName, companyName = 'IKIMINA-MISNA-MIS', primaryColor = '#0f172a' }) {
//   const name = escapeAttr(fullName || 'Member');
//   const safeCompany = escapeAttr(companyName);
//   const safePrimary = escapeAttr(primaryColor || '#0f172a');
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>Password changed</title>
// </head>
// <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
//     <tr>
//       <td style="background:#ffffff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
//         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//           <tr>
//             <td style="text-align:center;padding-bottom:18px;">
//               <h1 style="margin:0;font-size:22px;color:${safePrimary};">Password changed</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="font-size:15px;line-height:1.6;color:#334155;">
//               <p style="margin:0 0 12px">Hi <strong style="color:#0f172a;">${name}</strong>,</p>
//               <p style="margin:0 0 14px;">Your password for <strong style="color:${safePrimary};">${safeCompany}</strong> has been changed. If you did not make this change, contact support immediately.</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding-top:14px;border-top:1px solid #eef0f3;">
//               <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;text-align:center;">${safeCompany} &bull; Built for members</p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// function generateOTPEmail({ fullName, otp, companyName = 'IKIMINA-MISNA-MIS', primaryColor = '#0f172a' }) {
//   const name = escapeAttr(fullName || 'Member');
//   const code = escapeAttr(String(otp || ''));
//   const safeCompany = escapeAttr(companyName);
//   const safePrimary = escapeAttr(primaryColor || '#0f172a');
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>Your OTP code</title>
// </head>
// <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
//     <tr>
//       <td style="background:#ffffff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
//         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//           <tr>
//             <td style="text-align:center;padding-bottom:18px;">
//               <h1 style="margin:0;font-size:22px;color:${safePrimary};">Your OTP code</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="font-size:15px;line-height:1.6;color:#334155;">
//               <p style="margin:0 0 12px">Hi <strong style="color:#0f172a;">${name}</strong>,</p>
//               <p style="margin:0 0 18px;">Use the code below to complete your action for <strong style="color:${safePrimary};">${safeCompany}</strong>.</p>
//               <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
//                 <tr>
//                   <td style="background:${safePrimary};border-radius:8px;padding:12px 22px;">
//                     <span style="color:#ffffff;font-size:22px;letter-spacing:4px;font-weight:600;">${code}</span>
//                   </td>
//                 </tr>
//               </table>
//               <p style="margin:18px 0 0;color:#ef4444;font-size:13px;">This code expires in 10 minutes.</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding-top:14px;border-top:1px solid #eef0f3;">
//               <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;text-align:center;">${safeCompany} &bull; Built for members</p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// function generateInvitationEmail({ fullName, inviteUrl }) {
//   const name = escapeAttr(fullName || 'Member');
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>You have been invited</title>
// </head>
// <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
//     <tr>
//       <td style="background:#ffffff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
//         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//           <tr>
//             <td style="text-align:center;padding-bottom:18px;">
//               <h1 style="margin:0;font-size:22px;color:#0f172a;">You have been invited</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="font-size:15px;line-height:1.6;color:#334155;">
//               <p style="margin:0 0 12px">Hi <strong style="color:#0f172a;">${name}</strong>,</p>
//               <p style="margin:0 0 14px;">You have been invited to join IKIMINA-MIS. Click the button below to accept the invitation.</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding:6px 0 14px;">
//               <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
//                 <tr>
//                   <td style="background:#0f172a;border-radius:8px;">
//                     <a href="${escapeAttr(String(inviteUrl || ''))}" style="display:inline-block;padding:10px 20px;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;">Accept Invitation</a>
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding-top:14px;border-top:1px solid #eef0f3;">
//               <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;text-align:center;">IKIMINA-MIS Microfinance &bull; Built for members</p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// function generateNotificationEmail({ fullName, title, message }) {
//   const name = escapeAttr(fullName || 'Member');
//   const safeTitle = escapeAttr(String(title || 'Notification'));
//   const safeMessage = String(message || '').replace(/\n/g, '<br/>');
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>${safeTitle}</title>
// </head>
// <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
//     <tr>
//       <td style="background:#ffffff;border-radius:10px;padding:28px 24px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
//         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
//           <tr>
//             <td style="text-align:center;padding-bottom:18px;">
//               <h1 style="margin:0;font-size:22px;color:#0f172a;">${safeTitle}</h1>
//             </td>
//           </tr>
//           <tr>
//             <td style="font-size:15px;line-height:1.6;color:#334155;">
//               <p style="margin:0 0 12px">Hi <strong style="color:#0f172a;">${name}</strong>,</p>
//               <p style="margin:0 0 14px;">${safeMessage}</p>
//             </td>
//           </tr>
//           <tr>
//             <td style="padding-top:14px;border-top:1px solid #eef0f3;">
//               <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;text-align:center;">IKIMINA-MIS Microfinance &bull; Built for members</p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;
// }

// module.exports = {
//   buildWelcomeEmail,
//   generateVerificationEmail,
//   generatePasswordResetEmail,
//   generatePasswordChangedEmail,
//   generateOTPEmail,
//   generateInvitationEmail,
//   generateNotificationEmail,
// };











'use strict';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const BASE = `
  body{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
  table{border-collapse:collapse;}
  .wrap{max-width:560px;margin:0 auto;padding:40px 16px;}
  .card{background:#ffffff;border-radius:12px;overflow:hidden;}
  .body{padding:32px 32px 24px;}
  .footer{padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;}
  h1{margin:0 0 4px;font-size:20px;font-weight:600;color:#0f172a;letter-spacing:-0.2px;}
  p{margin:0 0 16px;font-size:15px;line-height:1.65;color:#475569;}
  p:last-child{margin-bottom:0;}
  strong{color:#0f172a;font-weight:600;}
  a.btn{display:inline-block;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;}
  .alert{padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px;line-height:1.55;}
  .code-block{text-align:center;margin:20px 0;}
  .otp{display:inline-block;font-size:28px;font-weight:700;letter-spacing:8px;padding:14px 28px;border-radius:8px;}
`;

function shell(headerBg, headerContent, bodyContent, footerText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${BASE}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<div class="wrap">
  <div class="card">
    <div style="background:${headerBg};padding:28px 32px;">${headerContent}</div>
    <div class="body">${bodyContent}</div>
    <div class="footer">${footerText}</div>
  </div>
</div>
</td></tr></table>
</body>
</html>`;
}

/* ─── 1. Welcome ──────────────────────────────────────────── */
function buildWelcomeEmail({
  fullName,
  dashboardUrl = '#',
  companyName = 'IKIMINA-MISNA-MIS',
  tagline = 'Intelligent Management Information System',
  primaryColor = '#0b3b5c',
  supportEmail = '',
  requiresApproval = false,
}) {
  const name = esc(fullName || 'Member');
  const co   = esc(companyName);
  const tl   = esc(tagline);
  const pc   = esc(primaryColor);
  const url  = esc(dashboardUrl);
  const sup  = esc(supportEmail);

  const header = `
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;">${co}</h1>
    <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">${tl}</p>`;

  const approvalNote = requiresApproval
    ? `<div class="alert" style="background:#fffbeb;border-left:3px solid #f59e0b;">
        <strong style="color:#92400e;">Pending approval</strong>
        <span style="color:#78350f;"> — an administrator will activate your account shortly.</span>
       </div>`
    : '';

  const supportLine = sup
    ? `<a href="mailto:${sup}" style="color:${pc};">${sup}</a>`
    : 'our support team';

  const body = `
    <h1>Welcome, ${name}</h1>
    <p style="color:#64748b;font-size:13px;margin-bottom:24px;">Your account is set up and ready.</p>
    ${approvalNote}
    <p>We kindly ask for your patience while we activate your account at <strong>${co}</strong>. Thank you for your understanding.</p>
    <p style="margin:28px 0;">
      <a href="${url}" class="btn" style="background:${pc};color:#fff;">Go to dashboard</a>
    </p>
    <p style="font-size:14px;color:#64748b;">Questions? Reach us at ${supportLine}.</p>`;

  return shell(pc, header, body, `&copy; 2026 ${co}`);
}

/* ─── 2. Email Verification ───────────────────────────────── */
function generateVerificationEmail({
  fullName,
  verificationUrl,
  companyName = 'IKIMINA-MISNA-MIS',
  primaryColor = '#0f172a',
}) {
  const name = esc(fullName || 'Member');
  const co   = esc(companyName);
  const pc   = esc(primaryColor);
  const url  = esc(String(verificationUrl ?? ''));

  const header = `<h1 style="color:#fff;">Verify your email</h1>`;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Click below to verify your email address for <strong>${co}</strong>.</p>
    <p style="margin:28px 0;">
      <a href="${url}" class="btn" style="background:${pc};color:#fff;">Verify email</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">If you did not create this account, ignore this message.</p>`;

  return shell(pc, header, body, co);
}

/* ─── 3. Password Reset ───────────────────────────────────── */
function generatePasswordResetEmail({
  fullName,
  resetUrl,
  companyName = 'IKIMINA-MISNA-MIS',
  primaryColor = '#0f172a',
}) {
  const name = esc(fullName || 'Member');
  const co   = esc(companyName);
  const pc   = esc(primaryColor);
  const url  = esc(String(resetUrl ?? ''));

  const header = `<h1 style="color:#fff;">Reset your password</h1>`;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Click below to choose a new password for <strong>${co}</strong>. This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:28px 0;">
      <a href="${url}" class="btn" style="background:${pc};color:#fff;">Reset password</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">If you did not request this, no action is needed.</p>`;

  return shell(pc, header, body, co);
}

/* ─── 4. Password Changed ─────────────────────────────────── */
function generatePasswordChangedEmail({
  fullName,
  companyName = 'IKIMINA-MISNA-MIS',
  primaryColor = '#0f172a',
}) {
  const name = esc(fullName || 'Member');
  const co   = esc(companyName);
  const pc   = esc(primaryColor);

  const header = `<h1 style="color:#fff;">Password changed</h1>`;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your <strong>${co}</strong> password was changed successfully.</p>
    <div class="alert" style="background:#fef2f2;border-left:3px solid #ef4444;">
      <span style="color:#991b1b;font-size:14px;">If you did not make this change, contact support immediately.</span>
    </div>`;

  return shell(pc, header, body, co);
}

/* ─── 5. OTP ──────────────────────────────────────────────── */
function generateOTPEmail({
  fullName,
  otp,
  companyName = 'IKIMINA-MISNA-MIS',
  primaryColor = '#0f172a',
}) {
  const name = esc(fullName || 'Member');
  const code = esc(String(otp ?? ''));
  const co   = esc(companyName);
  const pc   = esc(primaryColor);

  const header = `<h1 style="color:#fff;">Your one-time code</h1>`;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Use this code to complete your action on <strong>${co}</strong>.</p>
    <div class="code-block">
      <span class="otp" style="background:${pc};color:#fff;">${code}</span>
    </div>
    <p style="font-size:13px;color:#94a3b8;text-align:center;">Expires in 10 minutes. Do not share this code.</p>`;

  return shell(pc, header, body, co);
}

/* ─── 6. Invitation ───────────────────────────────────────── */
function generateInvitationEmail({ fullName, inviteUrl, companyName = 'IKIMINA-MISNA-MIS', primaryColor = '#0f172a' }) {
  const name = esc(fullName || 'Member');
  const co   = esc(companyName);
  const pc   = esc(primaryColor);
  const url  = esc(String(inviteUrl ?? ''));

  const header = `<h1 style="color:#fff;">You've been invited</h1>`;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>You've been invited to join <strong>${co}</strong>. Click below to accept.</p>
    <p style="margin:28px 0;">
      <a href="${url}" class="btn" style="background:${pc};color:#fff;">Accept invitation</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">This invitation may expire. Contact the sender if you have trouble.</p>`;

  return shell(pc, header, body, co);
}

/* ─── 7. Notification ─────────────────────────────────────── */
function generateNotificationEmail({ fullName, title, message, companyName = 'IKIMINA-MISNA-MIS', primaryColor = '#0f172a' }) {
  const name    = esc(fullName || 'Member');
  const safeTitle = esc(String(title ?? 'Notification'));
  const safeMsg   = String(message ?? '').replace(/\n/g, '<br>');
  const co      = esc(companyName);
  const pc      = esc(primaryColor);

  const header = `<h1 style="color:#fff;">${safeTitle}</h1>`;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>${safeMsg}</p>`;

  return shell(pc, header, body, co);
}

module.exports = {
  buildWelcomeEmail,
  generateVerificationEmail,
  generatePasswordResetEmail,
  generatePasswordChangedEmail,
  generateOTPEmail,
  generateInvitationEmail,
  generateNotificationEmail,
};