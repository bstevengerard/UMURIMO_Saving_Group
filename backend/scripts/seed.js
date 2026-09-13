const { getDB } = require('../lib/prisma');
const prisma = getDB();
const bcrypt = require('bcryptjs');

const now = () => new Date();

function hashPassword(plain, bcrypt) {
  return bcrypt.hashSync(plain, 10);
}

function buildMemberData(idx, bcrypt) {
  return {
    full_name: `Demo User ${String(idx).padStart(3, '0')}`,
    email: `demo${idx}@ikimina.test`,
    phone: `+25078${String(idx).padStart(7, '0')}`,
    national_id: String(190000000 + idx),
    password_hash: hashPassword('password123', bcrypt),
    role: idx === 1 ? 'admin' : 'member',
    is_active: true,
    is_approved: idx > 10,
  };
}

function buildLoanData(memberId, idx) {
  const amount = (10_000 + (idx % 7) * 20_000).toFixed(2);
  return {
    member_id: memberId,
    amount: Number(amount),
    interest_rate: 10,
    term_months: 3 + (idx % 12),
    status: ['pending', 'approved', 'disbursed', 'completed', 'overdue'][idx % 5],
    request_date: new Date(2025, 0, 1 + idx),
    approval_date: idx % 5 !== 0 ? new Date(2025, 0, 3 + idx) : undefined,
    disbursement_date: idx % 5 === 2 || idx % 5 === 3 ? new Date(2025, 0, 5 + idx) : undefined,
    due_date: idx % 5 < 4 ? new Date(2025, idx % 12, 15 + (idx % 28)) : undefined,
    balance: idx % 3 === 0 ? Math.round(Number(amount) * 0.35) : 0,
  };
}

function buildLoanSchedule(loanId, memberId, installment) {
  const principal = Math.random() * 50_000 + 10_000;
  const rate = 10;
  const months = 3 + (installment % 12);
  const monthly = principal / months;
  const interest = principal * (rate / 100 / 12);
  const total = monthly + interest;
  return {
    loan_id: loanId,
    member_id: memberId,
    installment_number: installment + 1,
    due_date: new Date(2025, installment % 12, 1 + (installment % 28)),
    principal_amount: Math.round(principal * 100) / 100,
    interest_amount: Math.round(interest * 100) / 100,
    total_amount: Math.round(total * 100) / 100,
    paid_amount: installment % 4 === 0 ? 0 : Math.round(total * 100) / 100,
    status: ['pending', 'paid', 'overdue', 'partial'][installment % 4],
    paid_at: installment % 4 === 1 ? new Date(2025, installment % 12, 5 + (installment % 28)) : undefined,
    payment_method: installment % 4 === 1 ? 'cash' : undefined,
    notes: null,
  };
}

function buildContributionData(memberId, weekOffset, recorderId) {
  return {
    member_id: memberId,
    week: new Date(2025, 0, 1 + weekOffset),
    amount: 2_000 + (weekOffset % 4) * 1_000,
    payment_status: 'paid',
    recorded_by_id: recorderId,
  };
}

function buildMeeting(idx, createdBy) {
  return {
    title: `Weekly Meeting ${String(idx + 1).padStart(3, '0')}`,
    date: new Date(2025, (idx * 2) % 12, (idx % 28) + 1),
    start_time: '09:00',
    end_time: '11:00',
    location: `Hall ${String((idx % 5) + 1)}`,
    description: `Demo meeting ${idx + 1} for seed data`,
    is_active: true,
    created_by_id: createdBy,
  };
}

function buildAnnouncement(idx, createdBy) {
  return {
    title: `Announcement ${idx + 1}`,
    message: `Demo announcement message number ${idx + 1}`,
    priority: ['low', 'medium', 'high', 'urgent'][idx % 4],
    expires_at: new Date(2026, (idx * 3) % 12, (idx % 28) + 1),
    created_by_id: createdBy,
    is_active: true,
  };
}

function buildAttendance(memberId, meetingId, idx) {
  return {
    member_id: memberId,
    meeting_id: meetingId,
    intent: ['pending', 'verified', 'rejected', 'escalated', 'cancelled'][idx % 5],
    timestamp: new Date(2025, (idx * 2) % 12, (idx % 28) + 1),
    verified: idx % 3 === 0,
    verified_by_id: idx % 3 === 0 ? memberId : undefined,
    verified_at: idx % 3 === 0 ? new Date(2025, (idx * 2) % 12, (idx % 28) + 2) : undefined,
  };
}

function buildSmsTemplate(idx) {
  return {
    name: `template_${idx + 1}`,
    content: `Hello {{name}}, your {{type}} reminder is ready.`,
    category: ['loan', 'attendance', 'contribution', 'meeting', 'general', 'repayment'][idx % 6],
    variables: ['name', 'type'],
    is_active: true,
  };
}

function buildSmsSubscription(memberId) {
  return {
    member_id: memberId,
    loan_alerts: true,
    contribution_reminders: true,
    attendance_alerts: true,
    meeting_reminders: true,
    general_notifications: true,
    repayment_alerts: true,
  };
}

function buildSmsNotification(templateId, createdBy) {
  return {
    recipient_phone: '+250788000000',
    recipient_member_id: createdBy,
    template_id: templateId,
    message: 'Demo SMS notification message',
    status: ['pending', 'sent', 'delivered', 'failed', 'cancelled'][Math.floor(Math.random() * 5)],
    priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
    category: ['loan', 'attendance', 'contribution', 'meeting', 'general', 'repayment'][Math.floor(Math.random() * 6)],
    scheduled_at: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    sent_at: Math.random() > 0.3 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1) : undefined,
    created_by_id: createdBy,
    delivery_provider: 'test-provider',
  };
}

function buildPwdToken(memberId) {
  const crypto = require('crypto');
  const tokenRaw = crypto.randomBytes(32).toString('hex');
  return {
    member_id: memberId,
    token_hash: crypto.createHash('sha256').update(tokenRaw).digest('hex'),
    expires_at: new Date(Date.now() + 3600 * 1000),
    is_used: Math.random() > 0.5,
  };
}

const RECORD_COUNT = 50;

async function main() {
  const bcrypt = require('bcryptjs');
  console.log('Seeding database...');

  let config = await prisma.loanConfiguration.findFirst();
  if (!config) {
    config = await prisma.loanConfiguration.create({ data: {} });
    console.log('Created default loan configuration');
  }

  const testAdminExists = await prisma.member.findFirst({ where: { email: 'admin@ikimina.rw' } });
  if (!testAdminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.member.create({
      data: {
        email: 'admin@ikimina.rw',
        national_id: 'TEST-ADMIN-001',
        password_hash: hashedPassword,
        full_name: 'Test Admin',
        phone: '+250780000000',
        role: 'admin',
        is_approved: true,
        is_active: true,
        email_verified: true,
      },
    });
    console.log('Created test admin user (admin@ikimina.rw / admin123)');
  }

  let members = await prisma.member.findMany();
  if (members.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - members.length;
    const newMembers = [];
    for (let i = 0; i < toAdd; i++) {
      newMembers.push(buildMemberData(members.length + i + 1, bcrypt));
    }
    const created = await prisma.member.createMany({ data: newMembers });
    console.log(`Created ${created.count} members`);
    members = await prisma.member.findMany();
  }

  const admin = members.find(m => m.role === 'admin') || members[0];
  const memberIds = members.map(m => m.id);
  const recorderId = admin.id;

  let templates = await prisma.smsTemplate.findMany();
  if (templates.length < RECORD_COUNT) {
    const toInsert = [];
    const existing = new Set(templates.map(t => t.name));
    for (let i = 0; i < RECORD_COUNT - templates.length; i++) {
      const t = buildSmsTemplate((templates.length + i) % 6);
      if (!existing.has(t.name)) {
        toInsert.push(t);
        existing.add(t.name);
      } else {
        toInsert.push({ ...t, name: `${t.name}_${i}` });
      }
    }
    if (toInsert.length > 0) {
      await prisma.smsTemplate.createMany({ data: toInsert });
      console.log(`Created ${toInsert.length} SMS templates`);
    }
    templates = await prisma.smsTemplate.findMany();
  }

  let meetings = await prisma.meeting.findMany();
  if (meetings.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - meetings.length;
    const newMeetings = [];
    for (let i = 0; i < toAdd; i++) {
      newMeetings.push(buildMeeting(meetings.length + i, recorderId));
    }
    const created = await prisma.meeting.createMany({ data: newMeetings });
    console.log(`Created ${created.count} meetings`);
    meetings = await prisma.meeting.findMany();
  }

  let loans = await prisma.loan.findMany();
  const loansToAdd = Math.min(RECORD_COUNT, members.length) - loans.length;
  if (loansToAdd > 0) {
    const newLoans = [];
    for (let i = 0; i < loansToAdd; i++) {
      newLoans.push(buildLoanData(memberIds[loans.length + i], i));
    }
    const created = await prisma.loan.createMany({ data: newLoans });
    console.log(`Created ${created.count} loans`);
    loans = await prisma.loan.findMany();
  }

  let schedules = await prisma.loanRepaymentSchedule.findMany();
  if (schedules.length < RECORD_COUNT && loans.length > 0) {
    let inserted = 0;
    const batch = [];
    for (const loan of loans) {
      if (schedules.length + inserted >= RECORD_COUNT) break;
      batch.push(buildLoanSchedule(loan.id, loan.member_id, inserted));
      inserted++;
    }
    if (batch.length > 0) {
      await prisma.loanRepaymentSchedule.createMany({ data: batch });
      console.log(`Created ${batch.length} repayment schedules`);
    }
    schedules = await prisma.loanRepaymentSchedule.findMany();
  }

  let contributions = await prisma.contribution.findMany();
  if (contributions.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - contributions.length;
    const newContributions = [];
    for (let i = 0; i < toAdd; i++) {
      newContributions.push(buildContributionData(memberIds[i % memberIds.length], i % 90, recorderId));
    }
    const created = await prisma.contribution.createMany({ data: newContributions });
    console.log(`Created ${created.count} contributions`);
    contributions = await prisma.contribution.findMany();
  }

  let attendanceRecs = await prisma.attendance.findMany();
  if (attendanceRecs.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - attendanceRecs.length;
    const newAttendance = [];
    for (let i = 0; i < toAdd; i++) {
      const meetingId = meetings[i % meetings.length]?.id || `mtg-${String((i % meetings.length) + 1).padStart(3, '0')}`;
      newAttendance.push(buildAttendance(memberIds[i % memberIds.length], meetingId, i));
    }
    const created = await prisma.attendance.createMany({ data: newAttendance });
    console.log(`Created ${created.count} attendance records`);
    attendanceRecs = await prisma.attendance.findMany();
  }

  let announcements = await prisma.announcement.findMany();
  if (announcements.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - announcements.length;
    const newAnnouncements = [];
    for (let i = 0; i < toAdd; i++) {
      newAnnouncements.push(buildAnnouncement(announcements.length + i, recorderId));
    }
    const created = await prisma.announcement.createMany({ data: newAnnouncements });
    console.log(`Created ${created.count} announcements`);
    announcements = await prisma.announcement.findMany();
  }

  let subs = await prisma.smsSubscription.findMany();
  if (subs.length < RECORD_COUNT) {
    const needed = RECORD_COUNT - subs.length;
    const newSubs = [];
    for (let i = 0; i < needed; i++) {
      newSubs.push(buildSmsSubscription(memberIds[subs.length + i]));
    }
    const created = await prisma.smsSubscription.createMany({ data: newSubs });
    console.log(`Created ${created.count} SMS subscriptions`);
    subs = await prisma.smsSubscription.findMany();
  }

  let notifs = await prisma.smsNotification.findMany();
  if (notifs.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - notifs.length;
    const newNotifs = [];
    for (let i = 0; i < toAdd; i++) {
      const templateId = templates[i % templates.length]?.id;
      newNotifs.push(buildSmsNotification(templateId, recorderId));
    }
    const created = await prisma.smsNotification.createMany({ data: newNotifs });
    console.log(`Created ${created.count} SMS notifications`);
    notifs = await prisma.smsNotification.findMany();
  }

  let pwds = await prisma.passwordResetToken.findMany();
  if (pwds.length < RECORD_COUNT) {
    const toAdd = RECORD_COUNT - pwds.length;
    const newTokens = [];
    for (let i = 0; i < toAdd; i++) {
      newTokens.push(buildPwdToken(memberIds[pwds.length + i]));
    }
    const created = await prisma.passwordResetToken.createMany({ data: newTokens });
    console.log(`Created ${created.count} password reset tokens`);
    pwds = await prisma.passwordResetToken.findMany();
  }

  console.log('\nSeeding complete.');
  await getDB().$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
