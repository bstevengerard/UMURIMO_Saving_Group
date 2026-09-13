const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.createAnnouncement = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { title, message, priority, expiresAt } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message: message || '',
        priority: priority || 'medium',
        expires_at: expiresAt ? new Date(expiresAt) : null,
        created_by_id: req.member.id
      },
      include: { created_by: { select: { full_name: true, email: true } } }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement_created', {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          priority: announcement.priority,
          createdAt: announcement.created_at,
          createdBy: {
            id: announcement.created_by.id,
            fullName: announcement.created_by.full_name,
            email: announcement.created_by.email
          }
        }
      });
    }

    return sendSuccess(res, 'Announcement created', announcement, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const {
      activeOnly = 'true',
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (activeOnly === 'true') {
      where.is_active = true;
      where.OR = [
        { expires_at: null },
        { expires_at: { gt: new Date() } }
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';

    const total = await prisma.announcement.count({ where });
    const data = await prisma.announcement.findMany({
      where,
      include: { created_by: { select: { full_name: true, email: true } } },
      orderBy,
      skip,
      take: limitNum
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    return sendSuccess(res, 'Announcements retrieved', {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      include: { created_by: { select: { full_name: true, email: true } } }
    });

    if (!announcement) {
      return sendError(res, 404, 'Announcement not found');
    }

    return sendSuccess(res, 'Announcement retrieved', announcement);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { title, message, priority, expiresAt, isActive } = req.body;

    const existing = await prisma.announcement.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return sendError(res, 404, 'Announcement not found');
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (priority !== undefined) updateData.priority = priority;
    if (expiresAt !== undefined) updateData.expires_at = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updateData.is_active = isActive;

    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: updateData,
      include: { created_by: { select: { full_name: true, email: true } } }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement_updated', {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          priority: announcement.priority,
          updatedAt: announcement.updated_at
        }
      });
    }

    return sendSuccess(res, 'Announcement updated', announcement);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id }
    });

    if (!announcement) {
      return sendError(res, 404, 'Announcement not found');
    }

    await prisma.announcement.delete({
      where: { id: req.params.id }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('announcement_deleted', {
        id: announcement.id
      });
    }

    return sendSuccess(res, 'Announcement deleted');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
