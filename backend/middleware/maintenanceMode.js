const jwt = require('jsonwebtoken');

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';
const adminBypass = process.env.MAINTENANCE_MODE_ADMIN_BYPASS !== 'false';

const HEALTH_PATHS = ['/health', '/api/health'];
const MAINTENANCE_STATUS_PATH = '/api/maintenance/status';

function isHealthPath(reqPath) {
  if (!reqPath) return false;
  return HEALTH_PATHS.includes(reqPath);
}

function isMaintenanceStatusPath(reqPath) {
  if (!reqPath) return false;
  return reqPath === MAINTENANCE_STATUS_PATH;
}

function isAdminRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    const decoded = jwt.verify(token, secret);
    return decoded && decoded.member && decoded.member.role === 'admin';
  } catch (err) {
    return false;
  }
}

function maintenanceMode(req, res, next) {
  if (!MAINTENANCE_MODE) {
    return next();
  }

  const reqPath = req.path;

  if (isHealthPath(reqPath) || isMaintenanceStatusPath(reqPath)) {
    return next();
  }

  if (adminBypass && isAdminRequest(req)) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: 'System Under Maintenance',
    maintenanceMode: true,
  });
}

module.exports = { maintenanceMode, MAINTENANCE_MODE };
