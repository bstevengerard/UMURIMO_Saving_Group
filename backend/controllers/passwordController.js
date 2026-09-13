const prisma = require('../lib/prisma').getDB();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { generateOtp, hashOtp } = require('../utils/otp');

const OTP_TTL_MS = 5 * 60 * 1000;

async function createPasswordResetOtp(memberId, tx = prisma) {
  const rawOtp = generateOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const record = await tx.passwordResetOtp.create({
    data: {
      member_id: memberId,
      otp_hash: otpHash,
      expires_at: expiresAt
    }
  });

  return { rawOtp, record };
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    const member = await prisma.member.findFirst({ where: { email } });

    if (!member) {
      return sendSuccess(res, 'If an account with that email exists, a reset OTP has been sent');
    }

    const recentOtp = await prisma.passwordResetOtp.findFirst({
      where: { member_id: member.id, is_used: false },
      orderBy: { created_at: 'desc' }
    });

    if (recentOtp && new Date(recentOtp.expires_at) > new Date()) {
      const secondsLeft = Math.ceil((new Date(recentOtp.expires_at) - new Date()) / 1000);
      return sendSuccess(res, 'An active OTP already exists. Please check your email or wait for it to expire.', {
        resendAvailableIn: Math.max(0, secondsLeft)
      });
    }

    const { rawOtp, record } = await createPasswordResetOtp(member.id);

    try {
      await emailService.sendOTPEmail({ fullName: member.full_name, email: member.email }, rawOtp, 'password_reset');
    } catch (err) {
      console.error('[PasswordReset] OTP email send failed (non-blocking)', err.message, { memberId: member.id });
    }

    if (process.env.NODE_ENV !== 'production') {
      return sendSuccess(res, 'If an account with that email exists, a reset OTP has been sent', {
        _devOtp: rawOtp
      });
    }

    return sendSuccess(res, 'If an account with that email exists, a reset OTP has been sent');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendError(res, 400, 'Email and OTP are required');
    }

    const member = await prisma.member.findFirst({ where: { email } });
    if (!member) {
      return sendError(res, 400, 'Invalid OTP or email');
    }

    const otpHash = hashOtp(otp);
    const resetRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        member_id: member.id,
        otp_hash: otpHash,
        is_used: false,
        expires_at: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      const expiredRecord = await prisma.passwordResetOtp.findFirst({
        where: { member_id: member.id, otp_hash: otpHash, is_used: false },
        orderBy: { created_at: 'desc' }
      });

      if (expiredRecord && new Date(expiredRecord.expires_at) <= new Date()) {
        return sendError(res, 400, 'OTP has expired. Please request a new one.');
      }

      return sendError(res, 400, 'Invalid or already used OTP');
    }

    const payload = { member: { id: member.id, otpVerified: true, otpId: resetRecord.id } };
    const tokenJwt = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5m' });

    return sendSuccess(res, 'OTP verified successfully', { token: tokenJwt });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { otp, newPassword, email } = req.body;

    if (!otp || !newPassword || !email) {
      return sendError(res, 400, 'OTP, new password and email are required');
    }

    if (newPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }

    const member = await prisma.member.findFirst({ where: { email } });
    if (!member) {
      return sendError(res, 400, 'Invalid OTP or email');
    }

    const otpHash = hashOtp(otp);
    const resetRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        member_id: member.id,
        otp_hash: otpHash,
        is_used: false,
        expires_at: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      const expiredRecord = await prisma.passwordResetOtp.findFirst({
        where: { member_id: member.id, otp_hash: otpHash, is_used: false },
        orderBy: { created_at: 'desc' }
      });

      if (expiredRecord && new Date(expiredRecord.expires_at) <= new Date()) {
        return sendError(res, 400, 'OTP has expired. Please request a new one.');
      }

      return sendError(res, 400, 'Invalid or already used OTP');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: { password_hash: hashedPassword }
      });

      await tx.passwordResetOtp.update({
        where: { id: resetRecord.id },
        data: { is_used: true }
      });
    });

    try {
      await emailService.sendPasswordChangedEmail(member);
    } catch (err) {
      console.error('[ResetPassword] Password changed email failed (non-blocking)', err.message, { memberId: member.id });
    }

    return sendSuccess(res, 'Password reset successfully');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    const member = await prisma.member.findFirst({ where: { email } });
    if (!member) {
      return sendSuccess(res, 'If an account with that email exists, a reset OTP has been sent');
    }

    const recentOtp = await prisma.passwordResetOtp.findFirst({
      where: { member_id: member.id, is_used: false },
      orderBy: { created_at: 'desc' }
    });

    if (recentOtp && new Date(recentOtp.expires_at) > new Date()) {
      const secondsLeft = Math.ceil((new Date(recentOtp.expires_at) - new Date()) / 1000);
      return sendSuccess(res, 'An active OTP already exists. Please check your email or wait for it to expire.', {
        resendAvailableIn: Math.max(0, secondsLeft)
      });
    }

    await prisma.passwordResetOtp.updateMany({
      where: { member_id: member.id, is_used: false },
      data: { is_used: true }
    });

    const { rawOtp } = await createPasswordResetOtp(member.id);

    try {
      await emailService.sendOTPEmail({ fullName: member.full_name, email: member.email }, rawOtp, 'password_reset');
    } catch (err) {
      console.error('[ResendOtp] OTP email send failed (non-blocking)', err.message, { memberId: member.id });
    }

    if (process.env.NODE_ENV !== 'production') {
      return sendSuccess(res, 'A new reset OTP has been sent', { _devOtp: rawOtp });
    }

    return sendSuccess(res, 'A new reset OTP has been sent');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
