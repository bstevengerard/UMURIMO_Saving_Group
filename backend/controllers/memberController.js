const prisma = require('../lib/prisma').getDB();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { pruneSensitive, toCamelCase } = require('../utils/responseHelper');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');

exports.approveMember = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const { role } = req.body;

    if (role) {
      const permissionDoc = await prisma.permission.findFirst({ where: { role } });
      const permissions = permissionDoc ? Object.fromEntries(Object.entries(permissionDoc.permissions || {})) : {};

      await prisma.member.update({
        where: { id: member.id },
        data: {
          role,
          permissions,
          is_approved: true,
          approved_by_id: req.member.id,
          approved_at: new Date()
        }
      });
    } else {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          is_approved: true,
          approved_by_id: req.member.id,
          approved_at: new Date()
        }
      });
    }

    const updatedMember = await prisma.member.findUnique({
      where: { id: member.id }
    });

    const memberEmail = updatedMember.email;
    const memberName = updatedMember.full_name || 'Member';

    if (memberEmail) {
      try {
        await emailService.sendNotificationEmail(updatedMember, {
          title: 'Account Approved',
          message: 'Your IKIMINA account has been approved. You can now log in to the dashboard.'
        });
        console.info('[ApproveMember] Approval email sent', { memberId: updatedMember.id, email: memberEmail });
      } catch (err) {
        console.error('[ApproveMember] Approval email failed', { memberId: updatedMember.id, email: memberEmail, error: err.message });
      }
    } else {
      console.warn('[ApproveMember] Skipped approval email — no email on file', { memberId: updatedMember.id });
    }

    const safe = pruneSensitive(updatedMember, ['password_hash', 'email_verification_token', 'email_verification_expires']);
    return sendSuccess(res, 'Member approved', toCamelCase(safe));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const pending = await prisma.member.findMany({
      where: { is_approved: false },
      select: {
        id: true, email: true, national_id: true, full_name: true,
        phone: true, role: true, created_at: true, updated_at: true,
        is_active: true, permissions: true, documents: true,
        email_verified: true
      }
    });

    return sendSuccess(res, 'Pending approvals retrieved', toCamelCase(pending));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.createMember = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { email, nationalId, password, fullName, phone, role } = req.body;

    const existing = await prisma.member.findFirst({
      where: { OR: [{ email }, { national_id: nationalId }] }
    });

    if (existing) {
      return sendError(res, 400, 'Member with this email or national ID already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password || crypto.randomBytes(8).toString('hex'), salt);

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

    const member = await prisma.member.create({
      data: {
        email,
        national_id: nationalId,
        password_hash: hashed,
        full_name: fullName,
        phone,
        role: finalRole
      }
    });

    try {
      await emailService.sendWelcomeEmail(member);
    } catch (err) {
      console.error('[CreateMember] Welcome email failed (non-blocking)', err.message, { memberId: member.id });
    }

    const safe = pruneSensitive(member, ['password_hash']);
    return sendSuccess(res, 'Member created', safe, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, isActive } = req.body;

    const member = await prisma.member.findUnique({ where: { id } });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const updateData = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive;

    const updated = await prisma.member.update({
      where: { id },
      data: updateData
    });

    const safe = pruneSensitive(updated, ['password_hash', 'email_verification_token', 'email_verification_expires']);
    return sendSuccess(res, 'Member updated', toCamelCase(safe));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.resetMemberPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }

    const member = await prisma.member.findUnique({ where: { id } });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await prisma.member.update({
      where: { id },
      data: { password_hash: hashed }
    });

    try {
      await emailService.sendPasswordChangedEmail(member);
    } catch (err) {
      console.error('[ResetMemberPassword] Notification email failed (non-blocking)', err.message, { memberId: member.id });
    }

    return sendSuccess(res, 'Password reset successfully');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.setMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const member = await prisma.member.findUnique({ where: { id } });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { is_active: isActive }
    });

    const safe = pruneSensitive(updated, ['password_hash', 'email_verification_token', 'email_verification_expires']);
    return sendSuccess(res, 'Member status updated', toCamelCase(safe));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateOwnProfile = async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    const member = await prisma.member.findUnique({
      where: { id: req.member.id }
    });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const updated = await prisma.member.update({
      where: { id: req.member.id },
      data: {
        ...(fullName !== undefined && { full_name: fullName }),
        ...(phone !== undefined && { phone })
      }
    });

    const safe = pruneSensitive(updated, ['password_hash', 'email_verification_token', 'email_verification_expires']);
    return sendSuccess(res, 'Profile updated', safe);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getAllMembers = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { page, limit, sortBy, sortOrder, activeOnly, search, role } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const where = {};
    if (activeOnly === 'true') where.is_active = true;
    if (role) where.role = role;

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const allowedSortFields = ['created_at', 'full_name', 'email', 'role', 'is_active'];
    const orderBy = applySorting(req.query, allowedSortFields, 'created_at');

    const total = await prisma.member.count({ where });
    const data = await prisma.member.findMany({
      where,
      select: {
        id: true, email: true, national_id: true, full_name: true,
        phone: true, role: true, is_active: true, is_approved: true,
        permissions: true, documents: true, created_at: true, updated_at: true,
        email_verified: true
      },
      orderBy,
      skip,
      take: limitNum
    });

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Members retrieved', toCamelCase({
      data,
      ...pagination
    }));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
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

    if (req.member.role !== 'admin' && member.id !== req.member.id) {
      return sendError(res, 403, 'Not authorized');
    }

    return sendSuccess(res, 'Member retrieved', toCamelCase(pruneSensitive(member, ['password_hash'])));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { id } = req.params;
    const { documentType } = req.body;

    if (!documentType) {
      return sendError(res, 400, 'Document type is required');
    }

    const member = await prisma.member.findUnique({ where: { id } });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const docId = crypto.randomUUID();
    const newDoc = {
      _id: docId,
      documentType,
      fileName: `document_${docId}.pdf`,
      fileUrl: '',
      uploadedAt: new Date(),
      verified: false
    };

    const currentDocs = Array.isArray(member.documents) ? member.documents : [];
    currentDocs.push(newDoc);

    const updated = await prisma.member.update({
      where: { id },
      data: { documents: currentDocs }
    });

    const safe = pruneSensitive(updated, ['password_hash', 'email_verification_token', 'email_verification_expires']);
    return sendSuccess(res, 'Document added', { member: safe }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteMember = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { id } = req.params;

    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    await prisma.member.delete({ where: { id } });

    return sendSuccess(res, 'Member deleted');
  } catch (err) {
    if (err.code === 'P2003' || err.message?.includes('Foreign key constraint')) {
      return sendError(res, 400, 'Cannot delete this member because they have related records, such as loans or contributions.');
    }
    return handlePrismaError(res, err);
  }
};
