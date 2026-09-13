const prisma = require('../lib/prisma').getDB();
const { toCamelCase } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.createContributionType = async (req, res) => {
  try {
    const data = req.body;
    data.created_by_id = req.member.id;
    const type = await prisma.contributionType.create({
      data: {
        name: data.name, description: data.description || '',
        amount: Number(data.amount) || 0, frequency: data.frequency || 'weekly',
        is_required: data.is_required !== undefined ? data.is_required : true,
        deadline: data.deadline ? new Date(data.deadline) : null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_by_id: req.member.id
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id, actor_role: req.member.role,
        action: 'create_contribution_type', entity_type: 'ContributionType', entity_id: type.id,
        new_values: { name: type.name, amount: type.amount }
      }
    });

    return sendSuccess(res, 'Contribution type created', toCamelCase(type), 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getContributionTypes = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const where = {};
    if (activeOnly === 'true') where.is_active = true;

    const types = await prisma.contributionType.findMany({
      where, orderBy: { created_at: 'desc' }
    });

    return sendSuccess(res, 'Contribution types retrieved', toCamelCase(types));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateContributionType = async (req, res) => {
  try {
    const type = await prisma.contributionType.findUnique({ where: { id: req.params.id } });
    if (!type) return sendError(res, 404, 'Contribution type not found');

    const updateData = {};
    const allowedFields = ['name', 'description', 'amount', 'frequency', 'is_required', 'deadline', 'is_active'];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        const prismaKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
        updateData[prismaKey] = key === 'amount' ? Number(req.body[key]) : req.body[key];
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.contributionType.update({ where: { id: req.params.id }, data: updateData });

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'update_contribution_type', entity_type: 'ContributionType', entity_id: updated.id,
          previous_values: toCamelCase(type), new_values: toCamelCase(updated)
        }
      });

      return updated;
    });

    return sendSuccess(res, 'Contribution type updated', toCamelCase(result));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteContributionType = async (req, res) => {
  try {
    const type = await prisma.contributionType.findUnique({ where: { id: req.params.id } });
    if (!type) return sendError(res, 404, 'Contribution type not found');

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'delete_contribution_type', entity_type: 'ContributionType', entity_id: type.id,
          previous_values: toCamelCase(type)
        }
      });

      await tx.contributionType.delete({ where: { id: req.params.id } });
    });

    return sendSuccess(res, 'Contribution type deleted');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
