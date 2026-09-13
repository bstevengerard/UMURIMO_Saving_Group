const { getDB } = require('../lib/prisma');
const prisma = getDB();

exports.checkPermission = (action) => {
  return async (req, res, next) => {
    try {
      if (req.member && req.member.role === 'admin') {
        return next();
      }

      if (!req.member || !req.member.role) {
        return res.status(403).json({ success: false, message: 'Not authorized - no role' });
      }

      const permissionDoc = await prisma.permission.findFirst({
        where: { role: req.member.role },
      });

      if (!permissionDoc) {
        return res.status(403).json({ success: false, message: 'Not authorized - no permissions defined for role' });
      }

      const isAllowed = permissionDoc.permissions?.[action] === true;

      if (!isAllowed) {
        return res.status(403).json({ success: false, message: `Not authorized - cannot perform action: ${action}` });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ success: false, message: 'Server error during permission check' });
    }
  };
};
