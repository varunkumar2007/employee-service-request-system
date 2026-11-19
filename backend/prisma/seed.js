const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Safety guard: Never seed in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Safety Guard: Seeding demo accounts in production is forbidden!');
    process.exit(1);
  }

  console.log('🌱 Starting safe development database seed...');

  // 1. Seed Departments
  console.log('Creating departments...');
  const itDept = await prisma.department.upsert({
    where: { code: 'DEPT-IT' },
    update: {},
    create: {
      name: 'Information Technology',
      code: 'DEPT-IT',
      description: 'Handles hardware, software, networking, and system access'
    }
  });

  const hrDept = await prisma.department.upsert({
    where: { code: 'DEPT-HR' },
    update: {},
    create: {
      name: 'Human Resources',
      code: 'DEPT-HR',
      description: 'Handles payroll, employee relations, policies, and benefits'
    }
  });

  const facilitiesDept = await prisma.department.upsert({
    where: { code: 'DEPT-FAC' },
    update: {},
    create: {
      name: 'Facilities Management',
      code: 'DEPT-FAC',
      description: 'Handles workplace physical infrastructure, maintenance, and supplies'
    }
  });

  // 2. Seed Categories with SLAs
  console.log('Creating categories with default SLA hours...');
  const catHardware = await prisma.category.upsert({
    where: { name: 'Hardware & Network' },
    update: {},
    create: {
      name: 'Hardware & Network',
      departmentId: itDept.id,
      defaultSlaHours: 12
    }
  });

  const catSoftware = await prisma.category.upsert({
    where: { name: 'Software & Tool Access' },
    update: {},
    create: {
      name: 'Software & Tool Access',
      departmentId: itDept.id,
      defaultSlaHours: 24
    }
  });

  const catPayroll = await prisma.category.upsert({
    where: { name: 'Payroll & Compensation' },
    update: {},
    create: {
      name: 'Payroll & Compensation',
      departmentId: hrDept.id,
      defaultSlaHours: 48
    }
  });

  const catLeaves = await prisma.category.upsert({
    where: { name: 'Leaves & Benefits' },
    update: {},
    create: {
      name: 'Leaves & Benefits',
      departmentId: hrDept.id,
      defaultSlaHours: 48
    }
  });

  const catMaintenance = await prisma.category.upsert({
    where: { name: 'Office Maintenance' },
    update: {},
    create: {
      name: 'Office Maintenance',
      departmentId: facilitiesDept.id,
      defaultSlaHours: 24
    }
  });

  // 3. Seed Users with Bcrypt-Hashed Passwords
  console.log('Creating demo users with hashed credentials...');
  const adminPassword = await bcrypt.hash('AdminPass@123', 10);
  const agentPassword = await bcrypt.hash('AgentPass@123', 10);
  const employeePassword = await bcrypt.hash('EmpPass@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.local' },
    update: {},
    create: {
      email: 'admin@company.local',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      departmentId: itDept.id
    }
  });

  const itAgent = await prisma.user.upsert({
    where: { email: 'agent.it@company.local' },
    update: {},
    create: {
      email: 'agent.it@company.local',
      passwordHash: agentPassword,
      fullName: 'Alex Rivera (IT Agent)',
      role: 'SUPPORT_AGENT',
      departmentId: itDept.id
    }
  });

  const hrAgent = await prisma.user.upsert({
    where: { email: 'agent.hr@company.local' },
    update: {},
    create: {
      email: 'agent.hr@company.local',
      passwordHash: agentPassword,
      fullName: 'Sarah Chen (HR Agent)',
      role: 'SUPPORT_AGENT',
      departmentId: hrDept.id
    }
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee.john@company.local' },
    update: {},
    create: {
      email: 'employee.john@company.local',
      passwordHash: employeePassword,
      fullName: 'John Doe',
      role: 'EMPLOYEE',
      departmentId: hrDept.id
    }
  });

  // 4. Seed Sample Service Requests with Activities & Comments
  console.log('Creating sample requests with audit history...');

  // Ticket 1: Pending Hardware Request
  const now = new Date();
  const ticket1Sla = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

  const ticket1 = await prisma.serviceRequest.upsert({
    where: { ticketNumber: 'REQ-2026-0001' },
    update: {},
    create: {
      ticketNumber: 'REQ-2026-0001',
      title: 'Laptop display flickering constantly',
      description: 'My laptop external monitor connector flickers whenever I move the HDMI cable. Need an inspection.',
      priority: 'HIGH',
      status: 'PENDING',
      categoryId: catHardware.id,
      createdById: employeeUser.id,
      slaDueDate: ticket1Sla,
      activities: {
        create: {
          actorId: employeeUser.id,
          activityType: 'REQUEST_CREATED',
          newValue: 'Ticket created with priority: HIGH'
        }
      }
    }
  });

  // Ticket 2: In-Progress Software Request with assigned agent and notes
  const ticket2Sla = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const ticket2 = await prisma.serviceRequest.upsert({
    where: { ticketNumber: 'REQ-2026-0002' },
    update: {},
    create: {
      ticketNumber: 'REQ-2026-0002',
      title: 'Need license for Figma Professional',
      description: 'Assigned to the new UX redesign project and need access to Figma workspace.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      categoryId: catSoftware.id,
      createdById: employeeUser.id,
      assignedToId: itAgent.id,
      slaDueDate: ticket2Sla,
      activities: {
        createMany: {
          data: [
            {
              actorId: employeeUser.id,
              activityType: 'REQUEST_CREATED',
              newValue: 'Ticket created with priority: MEDIUM',
              createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
            },
            {
              actorId: itAgent.id,
              activityType: 'ASSIGNMENT',
              oldValue: 'Unassigned',
              newValue: `Assigned to ${itAgent.fullName}`,
              createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000)
            },
            {
              actorId: itAgent.id,
              activityType: 'STATUS_CHANGE',
              oldValue: 'ASSIGNED',
              newValue: 'IN_PROGRESS',
              createdAt: new Date(now.getTime() - 30 * 60 * 1000)
            }
          ]
        }
      },
      comments: {
        createMany: {
          data: [
            {
              authorId: itAgent.id,
              message: 'Checking with procurement for available Figma seats.',
              isInternal: false // Visible to employee
            },
            {
              authorId: itAgent.id,
              message: 'Seat budget approved by lead, pending license key generation.',
              isInternal: true // Visible ONLY to Agents and Admin
            }
          ]
        }
      }
    }
  });

  console.log('✅ Development database seed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Demo Accounts Seeded:');
  console.log('1. Admin:      admin@company.local        / AdminPass@123');
  console.log('2. IT Agent:   agent.it@company.local     / AgentPass@123');
  console.log('3. HR Agent:   agent.hr@company.local     / AgentPass@123');
  console.log('4. Employee:   employee.john@company.local / EmpPass@123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
