const jwt = require('jsonwebtoken');
const { getDB } = require('../lib/prisma');
const prisma = getDB();

const tokenBlacklist = new Set();

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (tokenBlacklist.has(token)) {
        return res.status(401).json({ success: false, message: 'Token has been invalidated. Please log in again.' });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ success: false, message: 'Server configuration error' });
      }
      const decoded = jwt.verify(token, secret);
      const member = await prisma.member.findUnique({
        where: { id: decoded.member.id },
        select: {
          id: true,
          email: true,
          national_id: true,
          full_name: true,
          phone: true,
          role: true,
          is_active: true,
          is_approved: true,
          approved_by_id: true,
          approved_at: true,
          permissions: true,
          documents: true,
          email_verified: true,
          email_verification_token: true,
          email_verification_expires: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!member) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
      }

      const permissionDoc = await prisma.permission.findFirst({
        where: { role: member.role },
      });
      const permissions = permissionDoc ? permissionDoc.permissions || {} : {};

      req.member = { ...member, id: member.id, permissions };

      if (req.member && !req.member.is_approved && req.member.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Account pending admin approval' });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

exports.blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

exports.admin = (req, res, next) => {
  if (req.member && req.member.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};
