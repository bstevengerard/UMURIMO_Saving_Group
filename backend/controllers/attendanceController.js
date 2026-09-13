const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');
const attendanceService = require('../services/attendanceService');

exports.markAttendance = async (req, res) => {
  try {
    const { meetingId, memberId, intent = 'pending' } = req.body;

    if (!meetingId || !memberId) {
      return sendError(res, 400, 'Meeting ID and member ID are required');
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    if (meeting.attendance_status === 'finalized') {
      return sendError(res, 400, 'Cannot mark attendance for finalized meeting');
    }

    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const existingAttendance = await prisma.attendance.findFirst({
      where: { member_id: memberId, meeting_id: meetingId }
    });

    if (existingAttendance) {
      return sendError(res, 409, 'Attendance already marked for this member and meeting', {
        attendance: existingAttendance
      });
    }

    const allowedIntents = ['pending', 'verified', 'rejected', 'escalated', 'cancelled'];
    const normalizedIntent = allowedIntents.includes(intent) ? intent : 'pending';

    const attendance = await prisma.attendance.create({
      data: {
        member_id: memberId,
        meeting_id: meetingId,
        intent: normalizedIntent
      },
      include: {
        member: { select: { full_name: true, email: true, phone: true } }
      }
    });

    return sendSuccess(res, 'Attendance marked successfully', { attendance }, 201);
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'Attendance already marked for this member and meeting');
    }
    return handlePrismaError(res, err);
  }
};

exports.getAttendance = async (req, res) => {
  try {
    let where = {};

    if (req.member.role !== 'admin') {
      where.member_id = req.member.id;
    }

    const { memberId, meetingId, page, limit } = req.query;
    if (memberId) where.member_id = memberId;
    if (meetingId) where.meeting_id = meetingId;

    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const [attendanceRecords, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          member: { select: { full_name: true, email: true, phone: true } },
          verified_by: { select: { full_name: true, email: true } }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.attendance.count({ where })
    ]);

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Attendance records retrieved', {
      data: attendanceRecords,
      ...pagination
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.verifyAttendance = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { id } = req.params;

    const existing = await prisma.attendance.findUnique({
      where: { id }
    });

    if (!existing) {
      return sendError(res, 404, 'Attendance record not found');
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        verified: true,
        verified_by_id: req.member.id,
        verified_at: new Date()
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`meeting_${attendance.meeting_id}`).emit('attendance_verified', {
        attendance: {
          id: attendance.id,
          memberId: attendance.member_id,
          verified: true,
          verifiedBy: req.member.id,
          verifiedAt: attendance.verified_at
        }
      });
    }

    return sendSuccess(res, 'Attendance verified', { attendance });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { date: 'desc' }
    });

    const history = [];
    for (const meeting of meetings) {
      const records = await prisma.attendance.findMany({
        where: { meeting_id: meeting.id },
        include: {
          member: { select: { full_name: true, email: true } }
        }
      });
      history.push({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingDate: meeting.date,
        attendanceRecords: records
      });
    }

    return sendSuccess(res, 'Attendance history retrieved', history);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.bulkSaveAttendance = async (req, res) => {
  try {
    const { meetingId, attendances } = req.body;

    if (!meetingId || !Array.isArray(attendances)) {
      return sendError(res, 400, 'Meeting ID and attendance array are required');
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    const results = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const att of attendances) {
        const existing = await tx.attendance.findFirst({
          where: { member_id: att.memberId, meeting_id: meetingId }
        });

        if (existing) {
          const updated = await tx.attendance.update({
            where: { id: existing.id },
            data: {
              intent: att.intent || existing.intent,
              verified: att.verified || existing.verified,
              verified_by_id: att.verified ? req.member.id : existing.verified_by_id,
              verified_at: att.verified ? new Date() : existing.verified_at
            }
          });
          saved.push(updated);
        } else {
          const created = await tx.attendance.create({
            data: {
              member_id: att.memberId,
              meeting_id: meetingId,
              intent: att.intent || 'pending',
              verified: att.verified || false,
              verified_by_id: att.verified ? req.member.id : undefined,
              verified_at: att.verified ? new Date() : undefined
            }
          });
          saved.push(created);
        }
      }
      return saved;
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'bulk_save_attendance',
        entity_type: 'Meeting',
        entity_id: meetingId
      }
    }).catch(() => {});

    return sendSuccess(res, 'Bulk attendance saved', { count: results.length });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { memberId } = req.params;

    let where = {};
    if (memberId) {
      where.member_id = memberId;
    }

    const totalAttendance = await prisma.attendance.count({ where });
    const verifiedAttendance = await prisma.attendance.count({ where: { ...where, verified: true } });

    const attendanceRate = totalAttendance > 0
      ? +(verifiedAttendance / totalAttendance * 100).toFixed(1)
      : 0;

    return sendSuccess(res, 'Attendance stats retrieved', {
      totalAttendance,
      verifiedAttendance,
      attendanceRate
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
