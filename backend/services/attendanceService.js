const { getDB } = require('../lib/prisma');
const prisma = getDB();

async function getMeetingAttendanceSummary(meetingId, tx = prisma) {
  const [total, present, late] = await Promise.all([
    tx.attendance.count({ where: { meeting_id: meetingId } }),
    tx.attendance.count({ where: { meeting_id: meetingId, verified: true } }),
    tx.attendance.count({ where: { meeting_id: meetingId, intent: 'late' } })
  ]);

  const absent = total - present;

  return { total, present, absent, late };
}

async function finalizeMeeting(meetingId, actorId, actorRole, tx = prisma) {
  const meeting = await tx.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  if (meeting.attendance_status === 'finalized') {
    throw new Error('Meeting attendance is already finalized');
  }

  const summary = await getMeetingAttendanceSummary(meetingId, tx);

  const updated = await tx.meeting.update({
    where: { id: meetingId },
    data: { attendance_status: 'finalized' }
  });

  await tx.auditLog.create({
    data: {
      actor_id: actorId,
      actor_role: actorRole,
      action: 'finalize_meeting_attendance',
      entity_type: 'Meeting',
      entity_id: meetingId,
      new_values: { attendance_status: 'finalized', summary }
    }
  }).catch(() => {});

  return { meeting: updated, summary };
}

async function openAttendance(meetingId, actorId, actorRole, tx = prisma) {
  const meeting = await tx.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  if (meeting.attendance_status === 'finalized') {
    throw new Error('Cannot reopen finalized meeting attendance');
  }

  const updated = await tx.meeting.update({
    where: { id: meetingId },
    data: { attendance_status: 'open' }
  });

  await tx.auditLog.create({
    data: {
      actor_id: actorId,
      actor_role: actorRole,
      action: 'open_meeting_attendance',
      entity_type: 'Meeting',
      entity_id: meetingId,
      new_values: { attendance_status: 'open' }
    }
  }).catch(() => {});

  return updated;
}

async function closeAttendance(meetingId, actorId, actorRole, tx = prisma) {
  const meeting = await tx.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  if (meeting.attendance_status === 'finalized') {
    throw new Error('Cannot close finalized meeting attendance');
  }

  const updated = await tx.meeting.update({
    where: { id: meetingId },
    data: { attendance_status: 'closed' }
  });

  await tx.auditLog.create({
    data: {
      actor_id: actorId,
      actor_role: actorRole,
      action: 'close_meeting_attendance',
      entity_type: 'Meeting',
      entity_id: meetingId,
      new_values: { attendance_status: 'closed' }
    }
  }).catch(() => {});

  return updated;
}

module.exports = {
  getMeetingAttendanceSummary,
  finalizeMeeting,
  openAttendance,
  closeAttendance
};