const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const http = require('http');
const rateLimit = require('express-rate-limit');
const { initSocketIO } = require('./utils/socket');
const { protect } = require('./middleware/auth');
const { connectDB, getDB } = require('./lib/prisma');
const { initializeScheduler } = require('./utils/scheduler');
const { getAllowedLoanAmount } = require('./services/calculationService');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { maintenanceMode } = require('./middleware/maintenanceMode');

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'BREVO_API_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET === 'ikiminasecret123' || process.env.JWT_SECRET === 'your-secret-key' || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is too weak or using default value. Please set a strong secret.');
  process.exit(1);
}

connectDB();

initializeScheduler();

const initializeDefaultPermissions = require('./scripts/initPermissions');
initializeDefaultPermissions().then(() => {
  console.log('Permissions initialized');
}).catch((err) => {
  console.error('Permissions init failed:', err.message);
});

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = initSocketIO(server);
app.set('io', io);

const port = process.env.PORT || 5000;

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));

const cors = require('cors');

function parseCorsOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const corsOptions = {
  origin: (origin, cb) => {
    const allowed = parseCorsOrigins(process.env.CORS_ORIGINS);
    if (!origin) return cb(null, true);
    if (!allowed.length) return cb(new Error('CORS_ORIGINS is not configured'), false);
    if (allowed.includes('*')) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
};
app.use(cors(corsOptions));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use(maintenanceMode);

app.get('/api/maintenance/status', (req, res) => {
  res.json({ maintenanceMode: process.env.MAINTENANCE_MODE === 'true' });
});

app.use(express.static(path.join(__dirname, 'public')));

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/members/my-dashboard', protect, async (req, res) => {
  try {
    const memberId = req.member.id;
    const prisma = getDB();

    const [
      myLoansCount,
      myActiveLoans,
      myPendingLoans,
      myOverdueLoans,
      myCompletedLoans
    ] = await Promise.all([
      prisma.loan.count({ where: { member_id: memberId } }),
      prisma.loan.count({ where: { member_id: memberId, status: { in: ['disbursed', 'overdue'] } } }),
      prisma.loan.count({ where: { member_id: memberId, status: 'pending' } }),
      prisma.loan.count({ where: { member_id: memberId, status: 'overdue' } }),
      prisma.loan.count({ where: { member_id: memberId, status: 'completed' } }),
    ]);

    const balanceResult = await prisma.loan.aggregate({
      where: { member_id: memberId, status: { in: ['approved', 'disbursed', 'overdue'] } },
      _sum: { balance: true }
    });
    const myOutstandingBalance = balanceResult._sum.balance ? Number(balanceResult._sum.balance) : 0;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [
      savingsAggregate,
      weeklySavingsAggregate,
      myShares
    ] = await Promise.all([
      prisma.contribution.aggregate({
        where: { member_id: memberId },
        _sum: { amount: true }
      }),
      prisma.contribution.aggregate({
        where: { member_id: memberId, week: { gte: weekStart } },
        _sum: { amount: true }
      }),
      prisma.memberShare.findUnique({
        where: { member_id: memberId }
      })
    ]);

    const myTotalSavings = savingsAggregate._sum.amount ? Number(savingsAggregate._sum.amount) : 0;
    const myWeeklySavings = weeklySavingsAggregate._sum.amount ? Number(weeklySavingsAggregate._sum.amount) : 0;
    const myTotalSharesValue = myShares ? (myShares.number_of_shares * Number(myShares.share_value)) : 0;
    const myTotalSharesProfit = myShares ? Number(myShares.total_profit) : 0;
    const myTotalShares = myShares ? myShares.number_of_shares : 0;

    const [myAttendanceCount, myVerifiedCount] = await Promise.all([
      prisma.attendance.count({ where: { member_id: memberId } }),
      prisma.attendance.count({ where: { member_id: memberId, verified: true } }),
    ]);
    const myAttendanceRate = myAttendanceCount > 0
      ? +(myVerifiedCount / myAttendanceCount * 100).toFixed(1)
      : 0;

    const myPendingLoanCount = await prisma.loan.count({ where: { member_id: memberId, status: 'pending' } });
    const myPendingContribCount = await prisma.contribution.count({ where: { member_id: memberId, payment_status: 'pending' } });

    const myNetBalance = myTotalSavings + myTotalSharesValue + myTotalSharesProfit - myOutstandingBalance;

    res.json({
      myLoansCount,
      myActiveLoans,
      myPendingLoans,
      myOverdueLoans,
      myCompletedLoans,
      myOutstandingBalance,
      myTotalSavings,
      myWeeklySavings,
      myAttendanceCount,
      myVerifiedCount,
      myAttendanceRate,
      myPendingApprovals: myPendingLoanCount + myPendingContribCount,
      myPendingLoanCount,
      myPendingContribCount,
      myTotalShares,
      myTotalSharesValue,
      myTotalSharesProfit,
      myNetBalance
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.get('/api/loans/eligibility', protect, async (req, res) => {
  try {
    const eligibility = await getAllowedLoanAmount(req.member.id);
    res.json(eligibility);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

const { stopScheduler, getSchedulerStatus } = require('./utils/scheduler');

app.get('/api/scheduler/status', protect, require('./middleware/auth').admin, (req, res) => {
  try {
    const jobs = getSchedulerStatus();
    res.json({ jobs });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.post('/api/scheduler/start', protect, require('./middleware/auth').admin, (req, res) => {
  try {
    initializeScheduler();
    res.json({ message: 'Scheduler jobs started', jobs: getSchedulerStatus() });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.post('/api/scheduler/stop', protect, require('./middleware/auth').admin, (req, res) => {
  try {
    stopScheduler();
    res.json({ message: 'Scheduler jobs stopped', jobs: getSchedulerStatus() });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.post('/api/scheduler/trigger/:jobName', protect, require('./middleware/auth').admin, async (req, res) => {
  const { jobName } = req.params;

  try {
    const prisma = getDB();
    const schedulerJobs = {
      'overdue-loans': async () => {
        const overdueLoans = await prisma.loan.findMany({
          where: {
            due_date: { lt: new Date() },
            status: { in: ['disbursed', 'approved'] },
            balance: { gt: 0 }
          },
          include: {
            member: {
              select: { phone: true, full_name: true }
            }
          }
        });

        for (const loan of overdueLoans) {
          await prisma.smsNotification.create({
            data: {
              recipient_phone: loan.member.phone,
              recipient_member_id: loan.member_id,
              message: `Reminder: Your loan of ${loan.amount} RWF is overdue. Balance: ${loan.balance} RWF. Please make payment.`,
              status: 'pending',
              priority: 'high',
              category: 'loan'
            }
          });
        }
        return `Created ${overdueLoans.length} overdue loan reminders`;
      },

      'contribution-reminders': async () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const members = await prisma.member.findMany({
          where: { is_active: true }
        });
        const pendingContributions = await prisma.contribution.findMany({
          where: {
            week: { gte: startOfWeek },
            payment_status: 'pending'
          }
        });

        const memberPendingMap = new Map();
        pendingContributions.forEach(c => {
          const memberId = c.member_id;
          if (!memberPendingMap.has(memberId)) memberPendingMap.set(memberId, []);
          memberPendingMap.get(memberId).push(c);
        });

        for (const member of members) {
          if (memberPendingMap.has(member.id)) {
            await prisma.smsNotification.create({
              data: {
                recipient_phone: member.phone,
                recipient_member_id: member.id,
                message: `Reminder: This week's contribution is pending. Please make your payment today.`,
                status: 'pending',
                priority: 'medium',
                category: 'contribution'
              }
            });
          }
        }
        return `Sent contribution reminders to ${memberPendingMap.size} members`;
      },

      'meeting-reminders': async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const meetings = await prisma.meeting.findMany({
          where: {
            date: { gte: today, lt: tomorrow },
            is_active: true
          }
        });

        const members = await prisma.member.findMany({
          where: { is_active: true }
        });

        for (const meeting of meetings) {
          for (const member of members) {
            await prisma.smsNotification.create({
              data: {
                recipient_phone: member.phone,
                recipient_member_id: member.id,
                message: `Reminder: Meeting "${meeting.title}" today at ${meeting.start_time}. Location: ${meeting.location || 'TBD'}`,
                status: 'pending',
                priority: 'medium',
                category: 'meeting'
              }
            });
          }
        }
        return `Sent meeting reminders for ${meetings.length} meetings`;
      },

      'mark-overdue': async () => {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const result = await prisma.contribution.updateMany({
          where: {
            payment_status: 'pending',
            week: { lt: currentMonth }
          },
          data: {
            payment_status: 'overdue'
          }
        });
        return `Marked ${result.count} contributions as overdue`;
      }
    };

    if (!schedulerJobs[jobName]) {
      return res.status(404).json({ msg: `Job ${jobName} not found` });
    }

    const result = await schedulerJobs[jobName]();
    res.json({ message: `Successfully executed ${jobName} job`, result, jobs: getSchedulerStatus() });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/password'));
app.use('/api/members', require('./routes/members'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/repayments', require('./routes/repayments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/contribution-types', require('./routes/contributionTypes'));
app.use('/api/emergency-aid', require('./routes/emergencyAid'));
app.use('/api/obligations', require('./routes/obligations'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/shares', require('./routes/shares'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/meeting-fines', require('./routes/meetingFines'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reports/monthly', require('./routes/monthlyReports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/loan-config', require('./routes/loanConfig'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/email', require('./routes/email'));
app.use('/api/ledger', require('./routes/ledger'));

app.post('/api/contributions/batch', protect, require('./middleware/auth').admin, async (req, res) => {
  try {
    const { contributions } = req.body;

    if (!Array.isArray(contributions) || contributions.length === 0) {
      return res.status(400).json({ success: false, message: 'Contributions array is required' });
    }

    const prisma = getDB();
    const created = await prisma.$transaction(async (tx) => {
      const batch = [];
      for (const contrib of contributions) {
        const { memberId, week, amount, paymentMethod, contributionTypeId } = contrib;

        const member = await tx.member.findUnique({ where: { id: memberId } });
        if (!member) continue;

        const existing = await tx.contribution.findFirst({
          where: { member_id: memberId, week: new Date(week) }
        });

        if (existing) {
          const updated = await tx.contribution.update({
            where: { id: existing.id },
            data: {
              amount: Number(amount),
              payment_status: 'paid',
              recorded_by_id: req.member.id,
              updated_at: new Date(),
              payment_method: paymentMethod || undefined,
              contribution_type_id: contributionTypeId || undefined
            }
          });
          batch.push(updated);
        } else {
          const newContrib = await tx.contribution.create({
            data: {
              member_id: memberId,
              week: new Date(week),
              amount: Number(amount),
              payment_status: 'paid',
              recorded_by_id: req.member.id,
              payment_method: paymentMethod || 'Mobile Money',
              contribution_type_id: contributionTypeId
            }
          });
          batch.push(newContrib);
        }
      }
      return batch;
    });

    res.status(201).json({ success: true, message: 'Batch contributions recorded', count: created.length });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.get('/api/notifications', protect, async (req, res) => {
  try {
    const prisma = getDB();
    const rawLimit = req.query.limit;
    const parsedLimit = Number(rawLimit);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 10;

    const recent = await prisma.smsNotification.findMany({
      where: { status: { in: ['pending', 'sent'] } },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        message: true,
        status: true,
        created_at: true,
        category: true,
        recipient_member: {
          select: { full_name: true }
        }
      }
    });

    const formatted = recent.map(n => ({
      id: n.id,
      text: n.message || `${n.category} notification`,
      createdAt: n.created_at,
      status: n.status,
      memberName: n.recipient_member?.full_name || 'System'
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
  }
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Ikimina MS API!' });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('[GlobalErrorHandler]', err.message);
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Duplicate record detected' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ success: false, message: 'Invalid reference to related record' });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'An unexpected error occurred. Please try again later.' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running: http://localhost:${port}`);
  console.log(`Docs: http://localhost:${port}/api-docs`);
});
