const prisma = require('../lib/prisma').getDB();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { toCamelCase, pruneSensitive } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { validateRequired, validateString, validateEmail } = require('../utils/validation');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const signToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '6h' });
};

exports.register = async (req, res) => {
  try {
    const { email, nationalId, password, fullName, phone, role } = req.body;

    const requiredCheck = validateRequired(req.body, ['email', 'nationalId', 'password', 'fullName', 'phone']);
    if (!requiredCheck.valid) {
      return sendError(res, 400, requiredCheck.message);
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return sendError(res, 400, emailValidation.message);
    }

    const passwordValidation = validateString(password, 'Password', 6, 100);
    if (!passwordValidation.valid) {
      return sendError(res, 400, passwordValidation.message);
    }

    const fullNameValidation = validateString(fullName, 'Full name', 2, 255);
    if (!fullNameValidation.valid) {
      return sendError(res, 400, fullNameValidation.message);
    }

    const phoneValidation = validateString(phone, 'Phone', 10, 20);
    if (!phoneValidation.valid) {
      return sendError(res, 400, phoneValidation.message);
    }

    let member = await prisma.member.findFirst({
      where: { OR: [{ email }, { national_id: nationalId }] }
    });
    if (member) {
      return sendError(res, 400, 'Member already exists with this email or national ID');
    }

    let finalRole = role || 'member';

    const permissionDoc = await prisma.permission.findFirst({ where: { role: finalRole } });

    if (!permissionDoc) {
      const defaultPermissions = {
        viewOwnProfile: false, updateOwnProfile: false, applyForLoan: false,
        viewOwnLoans: false, makeContribution: false, viewOwnContributions: false,
        markOwnAttendance: false, viewOwnAttendance: false, viewAnnouncements: false,
        viewMeetings: false, updateSMSPreference: false
      };

      await prisma.permission.create({
        data: { role: finalRole, permissions: defaultPermissions }
      });
      console.log(`Created new role '${finalRole}' with default permissions`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    member = await prisma.member.create({
      data: {
        email, national_id: nationalId, password_hash: hashedPassword,
        full_name: fullName, phone, role: finalRole,
        is_approved: false, email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: member.id, actor_role: finalRole, action: 'register_member',
        entity_type: 'Member', entity_id: member.id,
        new_values: { fullName: member.full_name, email: member.email, role: finalRole }
      }
    });

    let welcomeResult = null;
    try {
      welcomeResult = await emailService.sendWelcomeAndVerificationEmail(
        { fullName: member.full_name, email: member.email },
        rawVerificationToken
      );
      console.log('[Register] Welcome+verification email result (non-blocking):', { memberId: member.id, sent: !!welcomeResult, result: welcomeResult });
    } catch (err) {
      console.error('[Register] Welcome+verification email failed (non-blocking)', err.message, { memberId: member.id });
    }

    const permissionDocFinal = await prisma.permission.findFirst({ where: { role: finalRole } });
    const memberPermissions = permissionDocFinal?.permissions || {};

    const { password_hash: _, email_verification_token: __, ...safeMember } = member;
    const welcomeEmailSent = !!welcomeResult;
    return sendSuccess(res, 'Registration submitted. Please verify your email before logging in. Awaiting admin approval.', {
      member: {
        id: safeMember.id, email: safeMember.email, nationalId: safeMember.national_id,
        fullName: safeMember.full_name, isApproved: safeMember.is_approved,
        role: safeMember.role, permissions: memberPermissions
      },
      welcomeEmailSent
    }, 201);
  } catch (err) {
    return handlePrismaError(res, err, '[Register]');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[Login] attempt email=', email, 'body keys=', Object.keys(req.body || {}));

    if (!email || typeof email !== 'string') {
      console.log('[Login] reject: missing email');
      return sendError(res, 400, 'Email is required');
    }
    if (!password || typeof password !== 'string') {
      console.log('[Login] reject: missing password');
      return sendError(res, 400, 'Password is required');
    }

    let member = await prisma.member.findFirst({ where: { email } });
    console.log('[Login] member found=', !!member, 'email=', email);
    if (!member) {
      return sendError(res, 400, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, member.password_hash);
    console.log('[Login] password match=', isMatch);
    if (!isMatch) {
      return sendError(res, 400, 'Invalid credentials');
    }

    console.log('[Login] is_approved=', member.is_approved, 'email_verified=', member.email_verified);
    if (!member.is_approved) {
      return sendError(res, 403, 'Account pending admin approval. Please contact administrator.');
    }

    if (!member.email_verified) {
      return sendError(res, 403, 'Please verify your email address before signing in.');
    }

    const permissionDocLogin = await prisma.permission.findFirst({ where: { role: member.role } });
    const memberPermissions = permissionDocLogin?.permissions || {};

    const payload = { member: { id: member.id, role: member.role } };
    const token = signToken(payload);

    await prisma.auditLog.create({
      data: {
        actor_id: member.id, actor_role: member.role, action: 'login',
        entity_type: 'Member', entity_id: member.id,
        new_values: { email: member.email, role: member.role }
      }
    }).catch(() => {});

    console.log('[Login] success email=', member.email);
    return sendSuccess(res, 'Login successful', {
      token,
      member: {
        id: member.id, email: member.email, nationalId: member.national_id,
        fullName: member.full_name, role: member.role,
        isApproved: member.is_approved, emailVerified: member.email_verified,
        permissions: memberPermissions
      }
    });
  } catch (err) {
    console.log('[Login] error=', err.message);
    return handlePrismaError(res, err, '[Login]');
  }
};

exports.getCurrentMember = async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.member.id },
      select: {
        id: true, email: true, national_id: true, full_name: true,
        phone: true, role: true, is_active: true, is_approved: true,
        permissions: true, documents: true, created_at: true, updated_at: true,
        email_verified: true
      }
    });
    if (!member) {
      return sendError(res, 404, 'Member not found');
    }
    const permissionDoc = await prisma.permission.findFirst({ where: { role: member.role } });
    const permissions = permissionDoc?.permissions || {};
    const memberObj = toCamelCase(member);
    const safeMember = pruneSensitive(memberObj, ['password_hash', 'email_verification_token', 'email_verification_expires']);
    return sendSuccess(res, 'Current member retrieved', { ...safeMember, permissions });
  } catch (err) {
    return handlePrismaError(res, err, '[GetCurrentMember]');
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const { blacklistToken } = require('../middleware/auth');
      await blacklistToken(token);
    }

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id, actor_role: req.member.role,
        action: 'logout', entity_type: 'Member', entity_id: req.member.id
      }
    }).catch(() => {});

    return sendSuccess(res, 'Logged out successfully');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required');
    }
    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters');
    }

    const member = await prisma.member.findUnique({
      where: { id: req.member.id }
    });
    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, member.password_hash);
    if (!isMatch) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.member.update({
      where: { id: member.id },
      data: { password_hash: hashedPassword }
    });

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const { blacklistToken } = require('../middleware/auth');
      await blacklistToken(token);
    }

    await prisma.auditLog.create({
      data: {
        actor_id: member.id, actor_role: member.role, action: 'change_password',
        entity_type: 'Member', entity_id: member.id
      }
    }).catch(() => {});

    try {
      await emailService.sendPasswordChangedEmail(member);
    } catch (err) {
      console.error('[ChangePassword] Notification email failed (non-blocking)', err.message, { memberId: member.id });
    }

    return sendSuccess(res, 'Password changed successfully. Please log in again.');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    console.log('[ResendVerification] hit for member=', req.member?.id, 'body keys=', Object.keys(req.body || {}));
    let member = null;

    if (req.member?.id) {
      member = await prisma.member.findUnique({ where: { id: req.member.id } });
    } else if (req.body?.email) {
      member = await prisma.member.findFirst({ where: { email: req.body.email } });
    }

    if (!member) {
      console.log('[ResendVerification] member not found');
      return sendError(res, 404, 'Member not found');
    }

    if (member.email_verified) {
      console.log('[ResendVerification] already verified');
      return sendSuccess(res, 'Email is already verified.');
    }

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.member.update({
      where: { id: member.id },
      data: {
        email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires
      }
    });

    const userForEmail = {
      fullName: member.full_name,
      email: member.email
    };

    const result = await emailService.sendVerificationEmail(userForEmail, rawVerificationToken);
    console.log('[ResendVerification] emailService result=', result ? 'sent' : 'disabled/missing-config');

    return sendSuccess(res, 'Verification email sent. Please check your inbox.');
  } catch (err) {
    console.log('[ResendVerification] error=', err.message);
    return handlePrismaError(res, err, '[ResendVerification]');
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return sendError(res, 400, 'Token is required');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const member = await prisma.member.findFirst({
      where: {
        email_verification_token: tokenHash,
        email_verification_expires: { gt: new Date() }
      }
    });

    if (!member) {
      return sendError(res, 400, 'Invalid or expired verification token');
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: updated.id, actor_role: updated.role, action: 'verify_email',
        entity_type: 'Member', entity_id: updated.id,
        new_values: { email: updated.email, emailVerified: true }
      }
    }).catch(() => {});

    return sendSuccess(res, 'Email verified successfully', { verified: true });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
