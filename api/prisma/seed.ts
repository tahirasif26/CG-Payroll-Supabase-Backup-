import { PrismaClient, AppRole, ClientStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_SUPER_ADMIN_EMAIL = 'super@cgpayroll.local';
const DEMO_SUPER_ADMIN_PASSWORD = 'SuperAdmin1!';
const DEMO_ADMIN_EMAIL = 'admin@demo.local';
const DEMO_ADMIN_PASSWORD = 'AdminPass1!';

async function main() {
  console.log('Seeding…');

  // ─── Permissions (canonical set, refined per module) ──────────────────────
  const permissions = [
    { key: 'employees.read', module: 'employees' },
    { key: 'employees.write', module: 'employees' },
    { key: 'payroll.read', module: 'payroll' },
    { key: 'payroll.write', module: 'payroll' },
    { key: 'payroll.approve', module: 'payroll' },
    { key: 'leave.read', module: 'leave' },
    { key: 'leave.write', module: 'leave' },
    { key: 'expenses.read', module: 'expenses' },
    { key: 'expenses.write', module: 'expenses' },
    { key: 'expenses.approve', module: 'expenses' },
    { key: 'assets.read', module: 'assets' },
    { key: 'assets.write', module: 'assets' },
    { key: 'audit.read', module: 'audit' },
    { key: 'tenants.manage', module: 'tenants' },
  ];
  for (const p of permissions) {
    await prisma.permission.upsert({ where: { key: p.key }, update: {}, create: p });
  }

  // ─── Feature flags (representative subset; full port lands per-module) ────
  const features = [
    { key: 'employees.view', module: 'employees', name: 'View Employees' },
    { key: 'employees.manage', module: 'employees', name: 'Manage Employees' },
    { key: 'payroll.view', module: 'payroll', name: 'View Payroll' },
    { key: 'payroll.run', module: 'payroll', name: 'Run Payroll' },
    { key: 'payroll.approve', module: 'payroll', name: 'Approve Payroll' },
    { key: 'leave.view', module: 'leave', name: 'View Leave' },
    { key: 'leave.manage', module: 'leave', name: 'Manage Leave' },
    { key: 'expenses.view', module: 'expenses', name: 'View Expenses' },
    { key: 'expenses.submit', module: 'expenses', name: 'Submit Expenses' },
    { key: 'expenses.approve', module: 'expenses', name: 'Approve Expenses' },
    { key: 'assets.view', module: 'assets', name: 'View Assets' },
    { key: 'assets.manage', module: 'assets', name: 'Manage Assets' },
    { key: 'reports.view', module: 'reports', name: 'View Reports' },
    { key: 'audit.view', module: 'audit', name: 'View Audit Logs' },
  ];
  for (const f of features) {
    await prisma.featureDefinition.upsert({
      where: { featureKey: f.key },
      update: { module: f.module, name: f.name },
      create: {
        featureKey: f.key,
        module: f.module,
        name: f.name,
        defaultEnabledForRoles: [AppRole.admin, AppRole.hr],
      },
    });
  }

  // ─── Global system role: Super Admin (clientId = null) ────────────────────
  // Note: Prisma's compound-unique constraint with nullable column doesn't
  // match Postgres NULL semantics — use findFirst + create explicitly.
  const superAdminRole =
    (await prisma.role.findFirst({
      where: { clientId: null, name: 'Super Admin' },
    })) ??
    (await prisma.role.create({
      data: {
        clientId: null,
        name: 'Super Admin',
        appRole: AppRole.super_admin,
        isSystem: true,
        description: 'Platform-wide super administrator',
      },
    }));

  // ─── Demo data — development only ─────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed complete (production — skipped demo data).');
    return;
  }

  // Super admin user
  const superAdminUser = await prisma.user.upsert({
    where: { email: DEMO_SUPER_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEMO_SUPER_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_SUPER_ADMIN_PASSWORD, 10),
      status: UserStatus.active,
      emailVerifiedAt: new Date(),
      profile: { create: { fullName: 'Super Admin' } },
    },
  });
  const existingSuperAdminBinding = await prisma.userRole.findFirst({
    where: { userId: superAdminUser.id, roleId: superAdminRole.id, clientId: null },
  });
  if (!existingSuperAdminBinding) {
    await prisma.userRole.create({
      data: { userId: superAdminUser.id, roleId: superAdminRole.id, clientId: null },
    });
  }

  // Demo tenant + Admin/Employee system roles + demo admin user
  const demoClient = await prisma.client.upsert({
    where: { companySlug: 'demo' },
    update: {},
    create: {
      companyName: 'Demo Company',
      companySlug: 'demo',
      companyEmail: 'admin@demo.local',
      country: 'AE',
      timezone: 'Asia/Dubai',
      baseCurrency: 'AED',
      status: ClientStatus.active,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { clientId_name: { clientId: demoClient.id, name: 'Admin' } },
    update: {},
    create: {
      clientId: demoClient.id,
      name: 'Admin',
      appRole: AppRole.admin,
      isSystem: true,
      description: 'Default system administrator role',
    },
  });
  await prisma.role.upsert({
    where: { clientId_name: { clientId: demoClient.id, name: 'Employee' } },
    update: {},
    create: {
      clientId: demoClient.id,
      name: 'Employee',
      appRole: AppRole.employee,
      isSystem: true,
      description: 'Default employee role',
    },
  });

  const demoAdmin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10),
      status: UserStatus.active,
      emailVerifiedAt: new Date(),
      primaryClientId: demoClient.id,
      profile: { create: { fullName: 'Demo Admin' } },
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId_clientId: {
        userId: demoAdmin.id,
        roleId: adminRole.id,
        clientId: demoClient.id,
      },
    },
    update: {},
    create: {
      userId: demoAdmin.id,
      roleId: adminRole.id,
      clientId: demoClient.id,
    },
  });

  console.log('Seed complete.');
  console.log('  super admin:', DEMO_SUPER_ADMIN_EMAIL, '/', DEMO_SUPER_ADMIN_PASSWORD);
  console.log('  demo admin :', DEMO_ADMIN_EMAIL, '/', DEMO_ADMIN_PASSWORD);
  console.log('  demo client:', demoClient.companySlug, `(${demoClient.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
