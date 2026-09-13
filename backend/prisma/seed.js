const { getDB } = require('../lib/prisma');
const seedChartOfAccounts = require('./seed-chart-of-accounts');

async function seed() {
  const prisma = getDB();

  console.log('Seeding database...');

  const adminExists = await prisma.permission.findUnique({ where: { role: 'admin' } });
  if (!adminExists) {
    await prisma.permission.create({
      data: {
        role: 'admin',
        permissions: {
          view_members: true, manage_members: true, viewPendingApprovals: true,
          approve_member: true, resetMemberPassword: true, viewDashboard: true,
          createLoan: true, viewAllLoans: true, updateLoanStatus: true,
          recordContribution: true, viewContributions: true, manage_contributions: true,
          markAttendance: true, verifyAttendance: true, createAnnouncement: true,
          updateAnnouncement: true, deleteAnnouncement: true, createMeeting: true,
          updateMeeting: true, deleteMeeting: true, sendSMS: true, broadcastSMS: true,
          viewSMSHistory: true, updateSMSStatus: true, generateReports: true,
          manageLoanConfig: true, viewAllRoles: true, viewRolePermissions: true,
          viewMemberRoleAndPermissions: true, manage_emergency_aid: true,
          manage_savings: true, manage_shares: true, view_audit_logs: true
        }
      }
    });
    console.log('Created admin permissions');
  }

  const memberExists = await prisma.permission.findUnique({ where: { role: 'member' } });
  if (!memberExists) {
    await prisma.permission.create({
      data: {
        role: 'member',
        permissions: {
          view_members: true, recordContribution: true, viewContributions: true,
          markAttendance: true, viewAllLoans: true, viewDashboard: true,
          viewMemberRoleAndPermissions: true
        }
      }
    });
    console.log('Created member permissions');
  }

  const treasurerExists = await prisma.permission.findUnique({ where: { role: 'treasurer' } });
  if (!treasurerExists) {
    await prisma.permission.create({
      data: {
        role: 'treasurer',
        permissions: {
          view_members: true, viewDashboard: true, viewAllLoans: true,
          recordContribution: true, viewContributions: true, markAttendance: true,
          viewMemberRoleAndPermissions: true, manage_savings: true
        }
      }
    });
    console.log('Created treasurer permissions');
  }

  const presidentExists = await prisma.permission.findUnique({ where: { role: 'president' } });
  if (!presidentExists) {
    await prisma.permission.create({
      data: {
        role: 'president',
        permissions: {
          view_members: true, viewDashboard: true, viewAllLoans: true,
          recordContribution: true, viewContributions: true, markAttendance: true,
          viewMemberRoleAndPermissions: true
        }
      }
    });
    console.log('Created president permissions');
  }

  let config = await prisma.loanConfiguration.findFirst();
  if (!config) {
    config = await prisma.loanConfiguration.create({ data: {} });
    console.log('Created default loan configuration');
  }

  const testAdminExists = await prisma.member.findFirst({ where: { email: 'admin@test.com' } });
  if (!testAdminExists) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.member.create({
      data: {
        email: 'admin@test.com',
        national_id: 'TEST-ADMIN-001',
        password_hash: hashedPassword,
        full_name: 'Test Admin',
        phone: '+250780000000',
        role: 'admin',
        is_approved: true,
        is_active: true
      }
    });
    console.log('Created test admin user (admin@test.com / admin123)');
  }

  console.log('Seeding complete.');
  await seedChartOfAccounts();
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await getDB().$disconnect();
  });
