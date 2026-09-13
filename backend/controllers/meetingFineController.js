const prisma = require('../lib/prisma').getDB();
const { toCamelCase } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.applyFinesToAbsent = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { amount, reason = 'Absent from meeting' } = req.body;
    const adminId = req.member.id;

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) return sendError(res, 404, 'Meeting not found');

    const absentRecords = await prisma.attendance.findMany({
      where: { meeting_id: meetingId, verified: false }
    });

    const results = await prisma.$transaction(async (tx) => {
      const batchResults = [];
      for (const record of absentRecords) {
        const existing = await tx.meetingFine.findFirst({
          where: { meeting_id: meetingId, member_id: record.member_id }
        });
        if (existing) {
          batchResults.push({ memberId: record.member_id, status: 'already_exists' });
          continue;
        }

        const fine = await tx.meetingFine.create({
          data: {
            meeting_id: meetingId, member_id: record.member_id,
            amount: Number(amount), reason, created_by_id: adminId
          }
        });

        await tx.auditLog.create({
          data: {
            actor_id: adminId, actor_role: req.member.role,
            action: 'meeting_fine_applied', entity_type: 'MeetingFine', entity_id: fine.id,
            new_values: { amount, reason, meetingId, memberId: record.member_id }
          }
        });

        batchResults.push({ memberId: record.member_id, status: 'applied', fine: toCamelCase(fine) });
      }
      return batchResults;
    });

    return sendSuccess(res, 'Fines processed', { results });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMeetingFines = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const fines = await prisma.meetingFine.findMany({
      where: { meeting_id: meetingId },
      include: {
        member: { select: { full_name: true, email: true, phone: true } },
        created_by: { select: { full_name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    return sendSuccess(res, 'Meeting fines retrieved', toCamelCase(fines));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.waiveFine = async (req, res) => {
  try {
    const { id } = req.params;
    const fine = await prisma.meetingFine.findUnique({ where: { id } });
    if (!fine) return sendError(res, 404, 'Fine not found');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.meetingFine.update({ where: { id }, data: { status: 'waived' } });

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'meeting_fine_waived', entity_type: 'MeetingFine', entity_id: updated.id,
          previous_values: { status: 'pending' }, new_values: { status: 'waived' }
        }
      });

      return updated;
    });

    return sendSuccess(res, 'Fine waived', { fine: toCamelCase(result) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.markFinePaid = async (req, res) => {
  try {
    const { id } = req.params;
    const fine = await prisma.meetingFine.findUnique({ where: { id } });
    if (!fine) return sendError(res, 404, 'Fine not found');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.meetingFine.update({
        where: { id },
        data: { status: 'paid', paid_at: new Date() }
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'meeting_fine_paid', entity_type: 'MeetingFine', entity_id: updated.id,
          previous_values: { status: 'pending' },
          new_values: { status: 'paid', paidAt: updated.paid_at }
        }
      });

      return updated;
    });

    return sendSuccess(res, 'Fine marked as paid', { fine: toCamelCase(result) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
