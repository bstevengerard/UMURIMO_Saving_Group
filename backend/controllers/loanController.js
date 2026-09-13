const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { toCamelCase } = require('../utils/responseHelper');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');
const { getAllowedLoanAmount, calculateInterest, calculateTotalRepayment, calculateMonthlyInstallment } = require('../services/calculationService');

exports.submitLoanRequest = async (req, res) => {
  try {
    const { amount, interestRate, termMonths } = req.body;

    const config = await prisma.loanConfiguration.findFirst();
    if (!config) {
      return sendError(res, 500, 'Loan configuration not found. Please contact administrator.');
    }

    const amountNum = Number(amount);
    const termNum = Number(termMonths);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return sendError(res, 400, 'Loan amount must be a positive number');
    }
    if (!Number.isFinite(termNum) || termNum <= 0) {
      return sendError(res, 400, 'Term must be a positive number of months');
    }
    if (termNum < Number(config.min_term_months) || termNum > Number(config.max_term_months)) {
      return sendError(res, 400, `Term must be between ${config.min_term_months} and ${config.max_term_months} months`);
    }
    if (amountNum < Number(config.min_loan_amount) || amountNum > Number(config.max_loan_amount)) {
      return sendError(res, 400, `Loan amount must be between ${Number(config.min_loan_amount)} and ${Number(config.max_loan_amount)}`);
    }

    const eligibility = await getAllowedLoanAmount(req.member.id);
    if (eligibility.eligibilityStatus !== 'eligible') {
      return sendError(res, 403, eligibility.ineligibilityReasons?.[0] || 'Not eligible for loan');
    }
    if (amountNum > eligibility.maxAllowed) {
      return sendError(res, 400, `Requested amount exceeds your eligible limit of ${eligibility.maxAllowed}`);
    }

    const finalRate = interestRate ? Number(interestRate) : Number(config.base_interest_rate);
    const requestDate = new Date();
    const dueDate = new Date(requestDate.getTime() + (termNum * 30 * 24 * 60 * 60 * 1000));

    const totalInterest = calculateInterest(amountNum, finalRate, termNum);
    const totalRepayment = amountNum + totalInterest;

    const loan = await prisma.loan.create({
      data: {
        member_id: req.member.id,
        amount: amountNum,
        interest_rate: finalRate,
        term_months: termNum,
        status: 'pending',
        request_date: requestDate,
        due_date: dueDate,
        balance: totalRepayment,
        original_interest_rate: finalRate,
        total_interest_rate: finalRate
      }
    });

    return sendSuccess(res, 'Loan request submitted', toCamelCase(loan), 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getLoans = async (req, res) => {
  try {
    const {
      page = '1',
      limit = '25',
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      fromDate,
      toDate,
      memberId
    } = req.query;

    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const where = {};

    if (req.member.role !== 'admin') {
      where.member_id = req.member.id;
    } else if (memberId) {
      where.member_id = memberId;
    }

    if (status) where.status = status;

    if (fromDate || toDate) {
      where.request_date = {};
      if (fromDate) where.request_date.gte = new Date(fromDate);
      if (toDate) where.request_date.lte = new Date(toDate);
    }

    const allowedSortFields = ['created_at', 'amount', 'status', 'request_date', 'due_date'];
    const orderBy = applySorting(req.query, allowedSortFields, 'created_at');

    const total = await prisma.loan.count({ where });
    const data = await prisma.loan.findMany({
      where,
      select: {
        id: true,
        member_id: true,
        amount: true,
        interest_rate: true,
        term_months: true,
        status: true,
        request_date: true,
        approval_date: true,
        disbursement_date: true,
        due_date: true,
        balance: true,
        original_interest_rate: true,
        total_interest_rate: true,
        interest_increment_applied: true,
        monthly_loan_limit_status: true,
        created_at: true,
        updated_at: true,
        member: {
          select: { full_name: true, email: true }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Loans retrieved', {
      data: toCamelCase(data),
      ...pagination
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getLoanById = async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id },
      include: {
        member: { select: { full_name: true, email: true } },
        repayment_schedules: { orderBy: { installment_number: 'asc' } }
      }
    });

    if (!loan) {
      return sendError(res, 404, 'Loan not found');
    }

    if (req.member.role !== 'admin' && loan.member_id !== req.member.id) {
      return sendError(res, 403, 'Not authorized');
    }

    const config = await prisma.loanConfiguration.findFirst();
    const eligibility = req.member.role === 'member' && loan.member_id === req.member.id
      ? await require('../services/calculationService').getAllowedLoanAmount(req.member.id)
      : null;

    const camelLoan = toCamelCase(loan);
    camelLoan.repaymentSchedule = camelLoan.repaymentSchedules || [];
    camelLoan.memberName = camelLoan.member?.fullName || 'Unknown';
    delete camelLoan.repaymentSchedules;

    return sendSuccess(res, 'Loan retrieved', {
      ...camelLoan,
      eligibility,
      loanConfig: config ? {
        maxLoanAmount: Number(config.max_loan_amount),
        minLoanAmount: Number(config.min_loan_amount),
        baseInterestRate: Number(config.base_interest_rate),
        interestIncrement: Number(config.interest_increment),
        allowInterestIncrement: config.allow_interest_increment,
        loanLimitMultiplier: Number(config.loan_limit_multiplier),
        principalBase: config.principal_base,
        monthlyLoanLimit: Number(config.monthly_loan_limit),
        maxActiveLoans: config.max_active_loans,
        profitFormula: config.profit_formula,
        shareProfitAllocationPercent: Number(config.share_profit_allocation_percent),
        emergencyAidFineRate: Number(config.emergency_aid_fine_rate),
        emergencyAidRestrictionRule: config.emergency_aid_restriction_rule
      } : null
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateLoanStatus = async (req, res) => {
  try {
    const { status, disbursementDate } = req.body;

    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id }
    });

    if (!loan) {
      return sendError(res, 404, 'Loan not found');
    }

    if (req.member.role !== 'admin' && status === 'disbursed') {
      const hasDisbursePermission = req.member.permissions?.manage_loans || req.member.permissions?.updateLoanStatus;
      if (!hasDisbursePermission) {
        return sendError(res, 403, 'Not authorized to disburse loans');
      }
    }

    if (req.member.role !== 'admin' && (status === 'approved' || status === 'rejected')) {
      const hasApprovePermission = req.member.permissions?.updateLoanStatus;
      if (!hasApprovePermission) {
        return sendError(res, 403, 'Not authorized to approve/reject loans');
      }
    }

    const updateData = { status };

    if (status === 'approved') {
      updateData.approval_date = new Date();
      updateData.approved_by_id = req.member.id;
    }

    if (status === 'disbursed') {
      updateData.disbursement_date = disbursementDate ? new Date(disbursementDate) : new Date();
      if (!loan.approved_by_id) {
        updateData.approved_by_id = req.member.id;
      }
    }

    if (status === 'completed') {
      updateData.balance = 0;
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: req.params.id },
      data: updateData
    });

    if (status === 'disbursed') {
      const existingCount = await prisma.loanRepaymentSchedule.count({
        where: { loan_id: updatedLoan.id }
      });

      if (existingCount === 0) {
        const totalAmount = updatedLoan.balance;
        const monthlyPrincipal = Math.ceil(totalAmount / updatedLoan.term_months);
        const schedule = [];
        let runningBalance = totalAmount;
        const interestRate = updatedLoan.interest_rate || 5;
        const interestPart = +((totalAmount * (interestRate / 100)) / updatedLoan.term_months).toFixed(2);

        for (let i = 1; i <= updatedLoan.term_months; i++) {
          const principalThis = Math.min(monthlyPrincipal, runningBalance);
          const payThis = +(principalThis + interestPart).toFixed(2);
          runningBalance = +(runningBalance - principalThis).toFixed(2);

          const dueDate = new Date(updatedLoan.disbursement_date || updatedLoan.request_date || new Date());
          dueDate.setMonth(dueDate.getMonth() + i);

          schedule.push({
            loan_id: updatedLoan.id,
            member_id: updatedLoan.member_id,
            installment_number: i,
            due_date: dueDate,
            principal_amount: principalThis,
            interest_amount: interestPart,
            total_amount: payThis,
            status: 'pending'
          });
        }

        await prisma.loanRepaymentSchedule.createMany({ data: schedule });
      }
    }

    return sendSuccess(res, 'Loan status updated', toCamelCase(updatedLoan));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.cancelLoan = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      return sendError(res, 404, 'Loan not found');
    }

    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id }
    });

    if (!loan) {
      return sendError(res, 404, 'Loan not found');
    }

    if (req.member.role !== 'admin' && loan.member_id !== req.member.id) {
      return sendError(res, 403, 'Not authorized');
    }

    if (loan.status !== 'pending') {
      return sendError(res, 400, 'Only pending loans can be cancelled');
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: req.params.id },
      data: { status: 'rejected' }
    });

    return sendSuccess(res, 'Loan cancelled', toCamelCase(updatedLoan));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getEligibility = async (req, res) => {
  try {
    const data = await getAllowedLoanAmount(req.member.id);
    return sendSuccess(res, 'Eligibility retrieved', data);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.previewLoan = async (req, res) => {
  try {
    const { amount, termMonths, interestRate } = req.body;

    if (!amount || !termMonths) {
      return sendError(res, 400, 'Amount and termMonths are required');
    }

    const config = await prisma.loanConfiguration.findFirst();
    const rate = interestRate ? Number(interestRate) : (config ? Number(config.base_interest_rate) : 3);
    const amountNum = Number(amount);
    const termNum = Number(termMonths);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return sendError(res, 400, 'Amount must be a positive number');
    }
    if (!Number.isFinite(termNum) || termNum <= 0) {
      return sendError(res, 400, 'Term must be a positive number');
    }

    const totalInterest = calculateInterest(amountNum, rate, termNum);
    const totalRepayment = amountNum + totalInterest;
    const monthlyInstallment = calculateMonthlyInstallment(totalRepayment, termNum);

    const eligibility = await getAllowedLoanAmount(req.member.id);
    const withinLimit = amountNum <= eligibility.maxAllowed;

    return sendSuccess(res, 'Loan preview calculated', {
      amount: amountNum,
      interestRate: rate,
      termMonths: termNum,
      totalInterest,
      totalRepayment,
      monthlyInstallment,
      maxAllowed: eligibility.maxAllowed,
      withinLimit
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.applyInterestIncrement = async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id },
      include: { member: { select: { full_name: true, email: true } } }
    });

    if (!loan) {
      return sendError(res, 404, 'Loan not found');
    }

    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    if (loan.interest_increment_applied) {
      return sendError(res, 400, 'Interest increment already applied to this loan');
    }

    const config = await prisma.loanConfiguration.findFirst();
    if (!config || !config.allow_interest_increment) {
      return sendError(res, 400, 'Interest increment is not allowed by configuration');
    }

    const incrementRate = Number(config.interest_increment) || 3;
    const originalRate = Number(loan.original_interest_rate || loan.interest_rate || config.base_interest_rate);
    const newTotalRate = +(originalRate + incrementRate).toFixed(2);

    const principal = Number(loan.amount);
    const termMonths = Number(loan.term_months);
    const totalInterest = +(principal * (newTotalRate / 100) * termMonths / 12).toFixed(2);
    const newBalance = +(principal + totalInterest).toFixed(2);

    const updatedLoan = await prisma.loan.update({
      where: { id: req.params.id },
      data: {
        total_interest_rate: newTotalRate,
        interest_increment_applied: true,
        interest_increment_date: new Date(),
        balance: newBalance
      }
    });

    const existingSchedule = await prisma.loanRepaymentSchedule.findMany({
      where: { loan_id: req.params.id },
      orderBy: { installment_number: 'asc' }
    });

    if (existingSchedule.length > 0) {
      const monthlyPrincipal = +(principal / termMonths).toFixed(2);
      const monthlyInterest = +(totalInterest / termMonths).toFixed(2);
      let principalAccum = 0;
      let interestAccum = 0;

      for (let i = 0; i < existingSchedule.length; i++) {
        const inst = existingSchedule[i];
        const isLast = i === existingSchedule.length - 1;
        const principalThis = isLast ? +(principal - principalAccum).toFixed(2) : monthlyPrincipal;
        const interestThis = isLast ? +(totalInterest - interestAccum).toFixed(2) : monthlyInterest;
        const totalThis = +(principalThis + interestThis).toFixed(2);

        principalAccum = +(principalAccum + principalThis).toFixed(2);
        interestAccum = +(interestAccum + interestThis).toFixed(2);

        await prisma.loanRepaymentSchedule.update({
          where: { id: inst.id },
          data: {
            principal_amount: principalThis,
            interest_amount: interestThis,
            total_amount: totalThis,
            interest_rate_at_time: newTotalRate
          }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'apply_interest_increment',
        entity_type: 'Loan',
        entity_id: loan.id,
        previous_values: { interest_rate: loan.interest_rate, total_interest_rate: loan.total_interest_rate, balance: loan.balance },
        new_values: { interest_rate: originalRate, total_interest_rate: newTotalRate, balance: newBalance, increment_applied: incrementRate }
      }
    }).catch(() => {});

    return sendSuccess(res, 'Interest increment applied', updatedLoan);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
