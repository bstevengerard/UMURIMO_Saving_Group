const prisma = require('../lib/prisma').getDB();
const { toCamelCase } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.getAuditLogs = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const { page = '1', limit = '25', entityType, actorId, action } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (entityType) where.entity_type = entityType;
    if (actorId) where.actor_id = actorId;
    if (action) where.action = action;

    const total = await prisma.auditLog.count({ where });
    const logs = await prisma.auditLog.findMany({
      where, include: { actor: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'desc' }, skip, take: limitNum
    });

    return sendSuccess(res, 'Audit logs retrieved', {
      data: toCamelCase(logs), total, page: pageNum, limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getEntityAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const logs = await prisma.auditLog.findMany({
      where: { entity_type: entityType, entity_id: entityId },
      include: { actor: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'desc' }
    });

    return sendSuccess(res, 'Entity audit logs retrieved', toCamelCase(logs));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
