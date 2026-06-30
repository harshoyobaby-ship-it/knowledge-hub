import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

const departments = [
  { name: "Purchase", description: "Procurement and vendor management" },
  { name: "Inventory", description: "Stock control and warehousing" },
  { name: "HR", description: "Human resources and onboarding" },
  { name: "Finance", description: "Accounting and financial planning" },
  { name: "Marketing", description: "Brand and digital marketing" },
  { name: "Operations", description: "Day-to-day business operations" },
  { name: "Quality", description: "Quality assurance and compliance" },
  { name: "E-commerce", description: "Online sales and fulfillment" },
];

async function main() {
  console.log("🌱 Seeding Kharesiya Knowledge Hub...\n");

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { ...dept, status: "ACTIVE" },
    });
  }
  console.log(`✓ ${departments.length} departments`);

  const ops = await prisma.department.findUnique({ where: { name: "Operations" } });

  const users = [
    {
      email: "admin@kharesiya.com",
      password: "Admin@123456",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      jobTitle: "System Administrator",
      departmentId: null,
    },
    {
      email: "hr@kharesiya.com",
      password: "Hr@123456",
      firstName: "Priya",
      lastName: "Sharma",
      role: UserRole.HR,
      jobTitle: "HR Manager",
      departmentId: (await prisma.department.findUnique({ where: { name: "HR" } }))?.id ?? null,
    },
    {
      email: "manager@kharesiya.com",
      password: "Manager@123456",
      firstName: "Ravi",
      lastName: "Patel",
      role: UserRole.MANAGER,
      jobTitle: "Operations Manager",
      departmentId: ops?.id ?? null,
    },
    {
      email: "employee@kharesiya.com",
      password: "Employee@123456",
      firstName: "Alex",
      lastName: "Johnson",
      role: UserRole.EMPLOYEE,
      jobTitle: "Operations Associate",
      departmentId: ops?.id ?? null,
    },
    {
      email: "student@kharesiya.com",
      password: "Student@123456",
      firstName: "Sam",
      lastName: "Student",
      role: UserRole.STUDENT,
      jobTitle: "Trainee",
      departmentId: ops?.id ?? null,
    },
    {
      email: "ecommerce@kharesiya.com",
      password: "Ecommerce@123456",
      firstName: "Riya",
      lastName: "Mehta",
      role: UserRole.EMPLOYEE,
      jobTitle: "E-commerce Specialist",
      departmentId: (await prisma.department.findUnique({ where: { name: "E-commerce" } }))?.id ?? null,
    },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: "ACTIVE",
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        jobTitle: u.jobTitle,
        departmentId: u.departmentId,
        status: "ACTIVE",
      },
    });
    console.log(`✓ User: ${u.email} (${u.role})`);
  }

  const admin = await prisma.user.findUnique({ where: { email: "admin@kharesiya.com" } });
  if (!admin) throw new Error("Admin user not found");

  const deptByName = Object.fromEntries(
    (await prisma.department.findMany()).map((d) => [d.name, d.id])
  );

  const sampleChapters = [
    {
      title: "Introduction to Purchase Orders",
      department: "Purchase",
      category: "Onboarding",
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 20,
      content:
        "<h3>Overview</h3><p>Learn how purchase orders flow from request to approval in Kharesiya Brands.</p><h3>Key Steps</h3><ul><li>Create a PO request</li><li>Route for approval</li><li>Issue to vendor</li></ul>",
      founderNotes: "Consistency in PO handling protects margin and vendor relationships.",
    },
    {
      title: "Vendor Selection Criteria",
      department: "Purchase",
      category: "Process",
      difficulty: "INTERMEDIATE" as const,
      estimatedMinutes: 35,
      content:
        "<h3>Overview</h3><p>Evaluate vendors on quality, cost, reliability, and compliance.</p>",
      founderNotes: "Never compromise on quality for short-term savings.",
    },
    {
      title: "Stock Receiving Workflow",
      department: "Inventory",
      category: "SOP",
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 25,
      content:
        "<h3>Overview</h3><p>Standard receiving process for inbound inventory across all warehouses.</p>",
    },
    {
      title: "Cycle Count Best Practices",
      department: "Inventory",
      category: "Process",
      difficulty: "ADVANCED" as const,
      estimatedMinutes: 45,
      content:
        "<h3>Overview</h3><p>Accurate cycle counts reduce shrinkage and improve forecast accuracy.</p>",
    },
    {
      title: "Employee Onboarding Checklist",
      department: "HR",
      category: "Onboarding",
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 15,
      content:
        "<h3>Overview</h3><p>HR onboarding steps for every new Kharesiya team member.</p>",
    },
    {
      title: "Warehouse Safety Fundamentals",
      department: "Operations",
      category: "Safety",
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 30,
      content:
        "<h3>Overview</h3><p>Essential safety protocols for warehouse and operations staff.</p>",
    },
  ];

  for (const ch of sampleChapters) {
    const departmentId = deptByName[ch.department];
    if (!departmentId) continue;

    const existing = await prisma.knowledgeChapter.findFirst({
      where: { title: ch.title, departmentId },
    });

    if (!existing) {
      await prisma.knowledgeChapter.create({
        data: {
          title: ch.title,
          departmentId,
          category: ch.category,
          difficulty: ch.difficulty,
          estimatedMinutes: ch.estimatedMinutes,
          content: ch.content,
          founderNotes: ch.founderNotes,
          status: "PUBLISHED",
          publishedAt: new Date(),
          authorId: admin.id,
        },
      });
    }
  }
  console.log(`✓ ${sampleChapters.length} learning chapters`);

  const sampleSOPs = [
    { title: "Purchase Order Approval", department: "Purchase" },
    { title: "Stock Count Procedure", department: "Inventory" },
    { title: "Quality Inspection Protocol", department: "Quality" },
  ];

  for (const sop of sampleSOPs) {
    const departmentId = deptByName[sop.department];
    if (!departmentId) continue;

    const existing = await prisma.sOP.findFirst({
      where: { title: sop.title, departmentId },
    });

    if (!existing) {
      await prisma.sOP.create({
        data: {
          title: sop.title,
          departmentId,
          ownerId: admin.id,
          effectiveDate: new Date(),
          status: "PUBLISHED",
          approvalStatus: "APPROVED",
        },
      });
    }
  }
  console.log(`✓ ${sampleSOPs.length} SOPs`);

  const opsDeptId = deptByName["Operations"];
  const invDeptId = deptByName["Inventory"];
  const qualDeptId = deptByName["Quality"];

  const sampleQuizzes = [
    { title: "Safety Fundamentals", departmentId: opsDeptId, passingPercentage: 80 },
    { title: "Inventory Basics", departmentId: invDeptId, passingPercentage: 70 },
    { title: "Quality Standards", departmentId: qualDeptId, passingPercentage: 75 },
  ];

  for (const q of sampleQuizzes) {
    if (!q.departmentId) continue;

    const existing = await prisma.quiz.findFirst({
      where: { title: q.title, departmentId: q.departmentId },
    });

    if (!existing) {
      await prisma.quiz.create({
        data: {
          title: q.title,
          departmentId: q.departmentId,
          passingPercentage: q.passingPercentage,
          status: "PUBLISHED",
          authorId: admin.id,
          questions: {
            create: [
              {
                type: "SINGLE_CHOICE",
                text: "What is the first step when starting this module?",
                options: ["Read the overview", "Skip to quiz", "Request exemption"],
                correctAnswer: "Read the overview",
                order: 0,
                points: 1,
              },
              {
                type: "TRUE_FALSE",
                text: "Following SOPs ensures consistency across teams.",
                correctAnswer: true,
                order: 1,
                points: 1,
              },
            ],
          },
        },
      });
    }
  }
  console.log(`✓ ${sampleQuizzes.length} quizzes`);

  const opsId = deptByName["Operations"];
  const existingCourse = await prisma.course.findFirst({
    where: { title: "Operations Onboarding" },
  });

  if (!existingCourse && opsId) {
    const course = await prisma.course.create({
      data: {
        title: "Operations Onboarding",
        description: "Complete self-paced onboarding for new operations team members.",
        departmentId: opsId,
        difficulty: "BEGINNER",
        estimatedHours: 2,
        status: "PUBLISHED",
        isSelfPaced: true,
        publishedAt: new Date(),
        authorId: admin.id,
        modules: {
          create: [
            {
              title: "Welcome & Safety",
              order: 0,
              lessons: {
                create: [
                  {
                    title: "Welcome to Kharesiya",
                    order: 0,
                    contentType: "TEXT",
                    durationMinutes: 10,
                    content:
                      "<h3>Welcome</h3><p>This course introduces you to Kharesiya Brands operations standards and safety practices.</p>",
                  },
                  {
                    title: "Safety Fundamentals",
                    order: 1,
                    contentType: "TEXT",
                    durationMinutes: 20,
                    content:
                      "<h3>Safety First</h3><p>Always follow warehouse safety protocols. Report hazards immediately.</p>",
                  },
                ],
              },
            },
            {
              title: "Daily Operations",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Receiving Workflow Overview",
                    order: 0,
                    contentType: "TEXT",
                    durationMinutes: 25,
                    content:
                      "<h3>Receiving</h3><p>Learn the standard receiving workflow for inbound inventory.</p>",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✓ LMS course: ${course.title}`);
  }

  const ecommerceId = deptByName["E-commerce"];
  if (ecommerceId) {
    const existingEcomCourse = await prisma.course.findFirst({
      where: { title: "E-commerce Fulfillment Training", departmentId: ecommerceId },
    });
    if (!existingEcomCourse) {
      await prisma.course.create({
        data: {
          title: "E-commerce Fulfillment Training",
          description: "E-commerce team only — order processing, returns, and fulfillment SOPs.",
          departmentId: ecommerceId,
          difficulty: "BEGINNER",
          estimatedHours: 1.5,
          status: "PUBLISHED",
          isSelfPaced: true,
          publishedAt: new Date(),
          authorId: admin.id,
          modules: {
            create: [
              {
                title: "Order Fulfillment",
                order: 0,
                lessons: {
                  create: [
                    {
                      title: "Picking & Packing Standards",
                      order: 0,
                      contentType: "TEXT",
                      durationMinutes: 15,
                      content: "<h3>E-commerce Fulfillment</h3><p>Standards for picking and packing online orders accurately.</p>",
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      console.log("✓ E-commerce department course");
    }

    const existingEcomChapter = await prisma.knowledgeChapter.findFirst({
      where: { title: "Returns Processing Guide", departmentId: ecommerceId },
    });
    if (!existingEcomChapter) {
      await prisma.knowledgeChapter.create({
        data: {
          title: "Returns Processing Guide",
          departmentId: ecommerceId,
          category: "E-commerce",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content: "<h3>Returns</h3><p>How to process customer returns for the E-commerce department.</p>",
          status: "PUBLISHED",
          publishedAt: new Date(),
          authorId: admin.id,
        },
      });
    }
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:    admin@kharesiya.com    / Admin@123456");
  console.log("  HR:       hr@kharesiya.com       / Hr@123456");
  console.log("  Manager:  manager@kharesiya.com  / Manager@123456");
  console.log("  Employee: employee@kharesiya.com / Employee@123456");
  console.log("  Student:  student@kharesiya.com  / Student@123456");
  console.log("  E-commerce: ecommerce@kharesiya.com / Ecommerce@123456");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
