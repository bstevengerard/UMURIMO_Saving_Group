const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { toCamelCase } = require('../utils/responseHelper');

const ALLOWED_CONFIG_FIELDS = [
  'max_loan_amount', 'min_loan_amount', 'base_interest_rate', 'interest_increment',
  'allow_interest_increment', 'interest_increment_condition', 'loan_limit_multiplier',
  'principal_base', 'fixed_principal_base', 'monthly_loan_limit', 'max_active_loans',
  'max_term_months', 'min_term_months', 'overdue_penalty_rate', 'grace_period_days',
  'repayment_reminder_days', 'allow_multiple_loans', 'require_guarantor',
  'profit_formula', 'share_profit_allocation_percent', 'share_distribution_period',
  'emergency_aid_fine_rate', 'emergency_aid_restriction_rule', 'restriction_rule_note',
  'attendance_fine_absence', 'attendance_fine_late', 'auto_create_attendance_fines'
];

function sanitizeConfigUpdates(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const key of ALLOWED_CONFIG_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      out[key] = raw[key];
    }
  }
  return out;
}

exports.getConfig = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    let config = await prisma.loanConfiguration.findFirst();
    if (!config) {
      try {
        config = await prisma.loanConfiguration.create({ data: {} });
      } catch (createErr) {
        return sendSuccess(res, 'Loan configuration unavailable', null);
      }
    }

    return sendSuccess(res, 'Loan configuration retrieved', toCamelCase(config));
  } catch (err) {
    console.error('[loanConfig] getConfig failed:', err.message);
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return sendSuccess(res, 'Loan configuration unavailable', null);
    }
    return handlePrismaError(res, err);
  }
};

exports.updateConfig = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const updates = sanitizeConfigUpdates(req.body);

    let config = await prisma.loanConfiguration.findFirst();
    if (!config) {
      config = await prisma.loanConfiguration.create({ data: updates });
      return sendSuccess(res, 'Loan configuration created', toCamelCase(config));
    }

    const updated = await prisma.loanConfiguration.update({
      where: { id: config.id },
      data: updates
    });

    return sendSuccess(res, 'Loan configuration updated', toCamelCase(updated));
  } catch (err) {
    console.error('[loanConfig] updateConfig failed:', err.message);
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return sendError(res, 500, 'Loan configuration table not initialized. Please run database migrations.');
    }
    return handlePrismaError(res, err);
  }
};
