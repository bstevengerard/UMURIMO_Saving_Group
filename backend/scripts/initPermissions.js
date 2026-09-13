const { getDB } = require('../lib/prisma');
const prisma = getDB();

async function initializeDefaultPermissions() {
  try {
    const adminExists = await prisma.permission.findFirst({ where: { role: 'admin' } });
    const memberExists = await prisma.permission.findFirst({ where: { role: 'member' } });

    if (!adminExists) {
      const adminPermissions = {
        view_members: true,
        manage_members: true,
        viewPendingApprovals: true,
        approve_member: true,
        resetMemberPassword: true,
        viewDashboard: true,
        createLoan: true,
        viewAllLoans: true,
        updateLoanStatus: true,
        recordContribution: true,
        viewContributions: true,
        markAttendance: true,
        verifyAttendance: true,
        createAnnouncement: true,
        updateAnnouncement: true,
        deleteAnnouncement: true,
        createMeeting: true,
        updateMeeting: true,
        deleteMeeting: true,
        sendSMS: true,
        broadcastSMS: true,
        viewSMSHistory: true,
        updateSMSStatus: true,
        generateReports: true,
        manageLoanConfig: true,
        viewAllRoles: true,
        viewRolePermissions: true,
        viewMemberRoleAndPermissions: true
      };

      await prisma.permission.create({
        data: { role: 'admin', permissions: adminPermissions }
      });
      console.log('Admin permissions created');
    }

    if (!memberExists) {
      const memberPermissions = {
        view_members: true,
        recordContribution: true,
        viewContributions: true,
        markAttendance: true,
        viewAllLoans: true,
        viewDashboard: true,
        viewMemberRoleAndPermissions: true
      };

      await prisma.permission.create({
        data: { role: 'member', permissions: memberPermissions }
      });
    }

    const treasurerExists = await prisma.permission.findFirst({ where: { role: 'treasurer' } });
    if (!treasurerExists) {
      const treasurerPermissions = {
        view_members: true,
        viewDashboard: true,
        viewAllLoans: true,
        recordContribution: true,
        viewContributions: true,
        markAttendance: true,
        viewMemberRoleAndPermissions: true
      };
      await prisma.permission.create({
        data: { role: 'treasurer', permissions: treasurerPermissions }
      });
      console.log('Treasurer permissions created');
    }

    const presidentExists = await prisma.permission.findFirst({ where: { role: 'president' } });
    if (!presidentExists) {
      const presidentPermissions = {
        view_members: true,
        viewDashboard: true,
        viewAllLoans: true,
        recordContribution: true,
        viewContributions: true,
        markAttendance: true,
        viewMemberRoleAndPermissions: true
      };
      await prisma.permission.create({
        data: { role: 'president', permissions: presidentPermissions }
      });
      console.log('President permissions created');
    }

    console.log('Default permissions initialization complete');
  } catch (error) {
    console.error('Error initializing permissions:', error);
    throw error;
  }
}

module.exports = initializeDefaultPermissions;
