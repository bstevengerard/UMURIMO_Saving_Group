const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.createTemplate = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const tpl = await prisma.smsTemplate.create({
      data: req.body
    });

    return sendSuccess(res, 'SMS template created', tpl, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const templates = await prisma.smsTemplate.findMany({});
    return sendSuccess(res, 'SMS templates retrieved', templates);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const tpl = await prisma.smsTemplate.update({
      where: { id: req.params.id },
      data: req.body
    });

    return sendSuccess(res, 'SMS template updated', tpl);
  } catch (err) {
    if (err.code === 'P2025') {
      return sendError(res, 404, 'Template not found');
    }
    return handlePrismaError(res, err);
  }
};

exports.sendSms = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const { recipientMemberId, message, category, priority, relatedEntityType, relatedEntityId } = req.body;
    let recipientPhone;

    if (recipientMemberId) {
      const member = await prisma.member.findUnique({
        where: { id: recipientMemberId }
      });
      if (!member) return sendError(res, 404, 'Member not found');
      recipientPhone = member.phone;
    } else if (req.body.recipientPhone) {
      recipientPhone = req.body.recipientPhone;
    } else {
      return sendError(res, 400, 'recipientMemberId or recipientPhone is required');
    }

    const notification = await prisma.smsNotification.create({
      data: {
        recipient_phone: recipientPhone,
        recipient_member_id: recipientMemberId || null,
        message,
        status: 'pending',
        priority: priority || 'medium',
        category: category || 'general',
        created_by_id: req.member.id,
        related_entity_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null
      }
    });

    setTimeout(async () => {
      try {
        await prisma.smsNotification.update({
          where: { id: notification.id },
          data: { status: 'sent', sent_at: new Date() }
        });
      } catch (e) {
        // ignore
      }
    }, 2000);

    return sendSuccess(res, 'SMS scheduled', notification, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.broadcastSms = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const { message, category, sendToInactive = false, subscribedOnly = true } = req.body;

    if (!message) return sendError(res, 400, 'Message is required');

    const where = {};
    if (!sendToInactive) where.is_active = true;

    const members = await prisma.member.findMany({
      where,
      select: { id: true, phone: true }
    });

    let matched = members;
    if (subscribedOnly) {
      const categoryToField = {
        general: 'general_notifications',
        loan: 'loan_alerts',
        contribution: 'contribution_reminders',
        attendance: 'attendance_alerts',
        meeting: 'meeting_reminders',
        repayment: 'repayment_alerts'
      };

      const subField = categoryToField[category] || 'general_notifications';
      const subs = await prisma.smsSubscription.findMany({
        where: { [subField]: true }
      });

      const subIds = new Set(subs.map(s => s.member_id));
      matched = members.filter(m => subIds.has(m.id));
    }

    const created = await prisma.smsNotification.createMany({
      data: matched.map(m => ({
        recipient_phone: m.phone,
        recipient_member_id: m.id,
        message,
        status: 'pending',
        priority: 'medium',
        category: category || 'general',
        created_by_id: req.member.id
      }))
    });

    setTimeout(async () => {
      try {
        const notifications = await prisma.smsNotification.findMany({
          where: {
            recipient_member_id: { in: matched.map(m => m.id) },
            status: 'pending'
          }
        });

        await prisma.smsNotification.updateMany({
          where: { id: { in: notifications.map(n => n.id) } },
          data: { status: 'sent', sent_at: new Date() }
        });
      } catch (e) {
        // ignore
      }
    }, 2000);

    return sendSuccess(res, 'Broadcast scheduled', { count: created.count }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.listNotifications = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const { status, category, recipientMemberId, startDate, endDate } = req.query;
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (recipientMemberId) where.recipient_member_id = recipientMemberId;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const list = await prisma.smsNotification.findMany({
      where,
      include: {
        recipient_member: { select: { full_name: true, email: true, phone: true } },
        created_by: { select: { full_name: true, email: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 500
    });

    const formatted = list.map(n => ({
      ...n,
      to: n.recipient_phone,
      sentAt: n.created_at
    }));

    return sendSuccess(res, 'SMS notifications retrieved', formatted);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getSubscription = async (req, res) => {
  try {
    let sub = await prisma.smsSubscription.findFirst({
      where: { member_id: req.member.id }
    });

    if (!sub) {
      sub = await prisma.smsSubscription.create({
        data: { member_id: req.member.id }
      });
    }

    return sendSuccess(res, 'SMS subscription retrieved', sub);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const sub = await prisma.smsSubscription.upsert({
      where: { member_id: req.member.id },
      update: req.body,
      create: {
        member_id: req.member.id,
        ...req.body
      }
    });

    return sendSuccess(res, 'SMS subscription updated', sub);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, providerMessageId, errorMessage } = req.body;

    const notif = await prisma.smsNotification.findUnique({
      where: { id }
    });

    if (!notif) {
      return sendError(res, 404, 'Notification not found');
    }

    const updateData = { status };

    if (status === 'delivered' || status === 'sent') {
      updateData.delivered_at = new Date();
    }

    if (providerMessageId) updateData.provider_message_id = providerMessageId;
    if (errorMessage) updateData.error_message = errorMessage;

    const updated = await prisma.smsNotification.update({
      where: { id },
      data: updateData
    });

    return sendSuccess(res, 'SMS status updated', updated);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
