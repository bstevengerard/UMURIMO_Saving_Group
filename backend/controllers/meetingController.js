const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');
const attendanceService = require('../services/attendanceService');

exports.createMeeting = async (req, res) => {
  try {
    const { title, date, startTime, endTime, location, description } = req.body;

    const meeting = await prisma.meeting.create({
      data: {
        title,
        date: new Date(date),
        start_time: startTime,
        end_time: endTime || null,
        location: location || null,
        description: description || null,
        created_by_id: req.member.id
      }
    });

    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: { created_by: { select: { full_name: true, email: true } } }
    });

    return sendSuccess(res, 'Meeting created', { meeting: updatedMeeting }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, activeOnly, upcomingOnly } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const where = {};
    if (activeOnly === 'true') where.is_active = true;
    if (upcomingOnly === 'true') where.date = { gte: new Date() };

    const allowedSortFields = ['date', 'created_at', 'title'];
    const orderBy = applySorting(req.query, allowedSortFields, 'date');

    const total = await prisma.meeting.count({ where });
    const data = await prisma.meeting.findMany({
      where,
      select: {
        id: true,
        title: true,
        date: true,
        start_time: true,
        end_time: true,
        location: true,
        description: true,
        event_type: true,
        is_active: true,
        attendance_status: true,
        created_by_id: true,
        created_at: true,
        updated_at: true,
        created_by: {
          select: { full_name: true, email: true }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Meetings retrieved', {
      data,
      ...pagination
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMeetingById = async (req, res) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      include: { created_by: { select: { full_name: true, email: true } } }
    });

    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    return sendSuccess(res, 'Meeting retrieved', meeting);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateMeeting = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { title, date, startTime, endTime, location, description, isActive } = req.body;

    const existing = await prisma.meeting.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return sendError(res, 404, 'Meeting not found');
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime || null;
    if (location !== undefined) updateData.location = location || null;
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.is_active = isActive;

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: updateData,
      include: { created_by: { select: { full_name: true, email: true } } }
    });

    return sendSuccess(res, 'Meeting updated', meeting);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id }
    });

    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    await prisma.meeting.delete({
      where: { id: req.params.id }
    });

    return sendSuccess(res, 'Meeting deleted');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMeetingQRCode = async (req, res) => {
  try {
    return sendError(res, 400, 'QR code attendance has been removed. Use admin attendance management instead.');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.openAttendance = async (req, res) => {
  try {
    const meeting = await attendanceService.openAttendance(req.params.id, req.member.id, req.member.role);
    return sendSuccess(res, 'Attendance opened', { meeting });
  } catch (err) {
    if (err.message === 'Meeting not found') return sendError(res, 404, err.message);
    if (err.message.includes('Cannot reopen')) return sendError(res, 400, err.message);
    return handlePrismaError(res, err);
  }
};

exports.closeAttendance = async (req, res) => {
  try {
    const meeting = await attendanceService.closeAttendance(req.params.id, req.member.id, req.member.role);
    return sendSuccess(res, 'Attendance closed', { meeting });
  } catch (err) {
    if (err.message === 'Meeting not found') return sendError(res, 404, err.message);
    if (err.message.includes('Cannot close')) return sendError(res, 400, err.message);
    return handlePrismaError(res, err);
  }
};

exports.finalizeAttendance = async (req, res) => {
  try {
    const result = await attendanceService.finalizeMeeting(req.params.id, req.member.id, req.member.role);
    return sendSuccess(res, 'Attendance finalized', result);
  } catch (err) {
    if (err.message === 'Meeting not found') return sendError(res, 404, err.message);
    if (err.message.includes('already finalized')) return sendError(res, 400, err.message);
    return handlePrismaError(res, err);
  }
};

exports.getMeetingAttendance = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 50 });

    const attendance = await prisma.attendance.findMany({
      where: { meeting_id: req.params.id },
      include: {
        member: { select: { full_name: true, email: true, phone: true } },
        verified_by: { select: { full_name: true, email: true } }
      },
      orderBy: { created_at: 'asc' },
      skip,
      take: limitNum
    });

    const total = await prisma.attendance.count({ where: { meeting_id: req.params.id } });
    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Attendance retrieved', {
      data: attendance,
      ...pagination
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMeetingAttendanceSummary = async (req, res) => {
  try {
    const summary = await attendanceService.getMeetingAttendanceSummary(req.params.id);
    return sendSuccess(res, 'Attendance summary retrieved', { meetingId: req.params.id, ...summary });
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

    if (meeting.attendance_status === 'finalized') {
      return sendError(res, 400, 'Cannot modify attendance for finalized meeting');
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
