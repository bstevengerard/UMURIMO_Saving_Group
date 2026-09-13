const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.permission.findMany({
      select: { role: true, permissions: true }
    });

    const rolesWithPermissions = roles.map(role => ({
      role: role.role,
      permissions: Object.fromEntries(Object.entries(role.permissions || {}))
    }));

    return sendSuccess(res, 'Roles retrieved', rolesWithPermissions);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;

    const permissionDoc = await prisma.permission.findFirst({
      where: { role }
    });

    if (!permissionDoc) {
      return sendError(res, 404, 'Role not found');
    }

    const permissions = Object.fromEntries(Object.entries(permissionDoc.permissions || {}));

    return sendSuccess(res, 'Role permissions retrieved', {
      role: permissionDoc.role,
      permissions
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.createRole = async (req, res) => {
  try {
    const { role, permissions } = req.body;

    const existingRole = await prisma.permission.findFirst({
      where: { role }
    });

    if (existingRole) {
      return sendError(res, 400, 'Role already exists');
    }

    const permissionDoc = await prisma.permission.create({
      data: {
        role,
        permissions: Object.fromEntries(Object.entries(permissions))
      }
    });

    const permissionsObj = Object.fromEntries(Object.entries(permissionDoc.permissions || {}));

    return sendSuccess(res, 'Role created', {
      role: permissionDoc.role,
      permissions: permissionsObj
    }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    const permissionDoc = await prisma.permission.findFirst({
      where: { role }
    });

    if (!permissionDoc) {
      return sendError(res, 404, 'Role not found');
    }

    let permissionsObj;
    if (Array.isArray(permissions)) {
      permissionsObj = Object.fromEntries(permissions.map(key => [key, true]));
    } else {
      permissionsObj = Object.fromEntries(Object.entries(permissions).filter(([, v]) => v));
    }

    const updated = await prisma.permission.update({
      where: { id: permissionDoc.id },
      data: { permissions: permissionsObj }
    });

    const resultPermissions = Object.fromEntries(Object.entries(updated.permissions || {}));

    return sendSuccess(res, 'Role permissions updated', {
      role: updated.role,
      permissions: resultPermissions
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (role === 'admin' || role === 'member') {
      return sendError(res, 400, 'Cannot delete admin or member roles');
    }

    const permissionDoc = await prisma.permission.findFirst({
      where: { role }
    });

    if (!permissionDoc) {
      return sendError(res, 404, 'Role not found');
    }

    await prisma.permission.delete({
      where: { id: permissionDoc.id }
    });

    return sendSuccess(res, 'Role deleted successfully');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.assignRoleToMember = async (req, res) => {
  try {
    const { memberId, role } = req.body;

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const permissionDoc = await prisma.permission.findFirst({
      where: { role }
    });

    if (!permissionDoc) {
      return sendError(res, 404, 'Role not found');
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { role }
    });

    const { password_hash, ...safeMember } = updated;

    return sendSuccess(res, 'Role assigned to member', safeMember);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMemberRoleAndPermissions = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    const permissionDoc = await prisma.permission.findFirst({
      where: { role: member.role }
    });

    const permissions = permissionDoc
      ? Object.fromEntries(Object.entries(permissionDoc.permissions || {}))
      : {};

    return sendSuccess(res, 'Member role and permissions retrieved', {
      memberId: member.id,
      role: member.role,
      permissions
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
