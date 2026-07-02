import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import {
  buildSkuCreativeChecklistHtml,
  SKU_CREATIVE_CHECKLIST_ATTACHMENT,
} from "./content/sku-creative-checklist";

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
      password: "SuperAdmin@123456",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      jobTitle: "System Administrator",
      departmentId: null,
    },
    {
      email: "founder@kharesiya.com",
      password: "Founder@123456",
      firstName: "Kharesiya",
      lastName: "Founder",
      role: UserRole.ADMIN,
      jobTitle: "Founder",
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

  const founder = await prisma.user.findUnique({ where: { email: "founder@kharesiya.com" } });
  if (!founder) throw new Error("Founder user not found");

  const deptByName = Object.fromEntries(
    (await prisma.department.findMany()).map((d) => [d.name, d.id])
  );

  // Company-wide mandatory module (published to every department).
  // This is intentionally seeded as a Knowledge Chapter so it appears in "Learning Modules"
  // across all role panels without requiring LearningPath support for SOP items.
  const EMAIL_SOP_MODULE_TITLE = "Module 1 (Mandatory): Official Email Communication SOP";
  const EMAIL_SOP_ATTACHMENTS = [
    {
      filename: "email-sop-v1.pdf",
      originalName: "EMAIL STANDARD OPERATING PROCEDURE.pdf",
      mimeType: "application/pdf",
      size: 396833,
      url: "/policies/email-sop-v1.pdf",
    },
    {
      filename: "email-sop-v1.docx",
      originalName: "EMAIL STANDARD OPERATING PROCEDURE.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 34993,
      url: "/policies/email-sop-v1.docx",
    },
  ] as const;

  const emailSopHtml = `
<h2>Official Email Communication Policy (SOP)</h2>
<p><strong>Applies to:</strong> All employees, consultants, interns, vendors and business associates using official company email.</p>
<p><strong>Effective date:</strong> 01-07-2026</p>

<h3>Purpose</h3>
<ul>
  <li>Improve communication efficiency</li>
  <li>Reduce unnecessary emails</li>
  <li>Ensure accountability and records</li>
  <li>Protect confidential information and prevent leakage</li>
</ul>

<h3>General Principles</h3>
<p>Every email must be necessary, professional, relevant, concise, accurate, action-oriented, and free from emotional language.</p>

<h3>Golden Rules</h3>
<ol>
  <li>Only mark people who are genuinely required</li>
  <li><strong>TO = Action</strong></li>
  <li><strong>CC = Information</strong></li>
  <li><strong>BCC = Privacy</strong> (exceptional situations only)</li>
  <li>One email = one primary purpose</li>
  <li>Avoid unnecessary Reply All</li>
  <li>Verify recipients, subject, attachments, grammar, dates, and confidentiality before sending</li>
</ol>

<p><strong>Download and read the full SOP</strong> from the attachments on this module.</p>
`.trim();

  const allDepartments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  for (const dept of allDepartments) {
    const existingModule = await prisma.knowledgeChapter.findFirst({
      where: { title: EMAIL_SOP_MODULE_TITLE, departmentId: dept.id },
      select: { id: true },
    });

    const module =
      existingModule ??
      (await prisma.knowledgeChapter.create({
        data: {
          title: EMAIL_SOP_MODULE_TITLE,
          description: "Company-wide mandatory SOP for official email communication standards.",
          departmentId: dept.id,
          category: "Onboarding",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content: emailSopHtml,
          founderNotes:
            "Mandatory for everyone. Ensure your team follows TO/CC/BCC rules, subject format, and confidentiality guidelines.",
          references: [],
          status: "PUBLISHED",
          publishedAt: new Date(),
          authorId: founder.id,
        },
        select: { id: true },
      }));

    for (const file of EMAIL_SOP_ATTACHMENTS) {
      const existing = await prisma.attachment.findFirst({
        where: { chapterId: module.id, originalName: file.originalName },
        select: { id: true },
      });
      if (!existing) {
        await prisma.attachment.create({
          data: {
            chapterId: module.id,
            filename: file.filename,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            url: file.url,
          },
        });
      }
    }
  }
  console.log(`✓ Mandatory Module 1 seeded for ${allDepartments.length} departments`);

  type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

  const departmentContent: Record<
    string,
    {
      chapters: Array<{
        title: string;
        category: string;
        difficulty: Difficulty;
        estimatedMinutes: number;
        content: string;
        founderNotes?: string;
      }>;
      sopTitle: string;
      quizTitle: string;
      passingPercentage: number;
      courseTitle: string;
      courseDescription: string;
      lessons: Array<{ title: string; content: string; durationMinutes: number }>;
      pathName: string;
    }
  > = {
    Purchase: {
      chapters: [
        {
          title: "Introduction to Purchase Orders",
          category: "Onboarding",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content:
            "<h3>Overview</h3><p>Learn how purchase orders flow from request to approval in Kharesiya Brands.</p><ul><li>Create a PO request</li><li>Route for approval</li><li>Issue to vendor</li></ul>",
          founderNotes: "Consistency in PO handling protects margin and vendor relationships.",
        },
        {
          title: "Vendor Selection Criteria",
          category: "Process",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 35,
          content:
            "<h3>Overview</h3><p>Evaluate vendors on quality, cost, reliability, and compliance before onboarding.</p>",
        },
        {
          title: "SKU Creative Checklist",
          category: "SOP",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 90,
          content: buildSkuCreativeChecklistHtml(),
          founderNotes:
            "Procurement must verify packaging specs, barcodes, and vendor print proofs against this checklist before approving artwork for production.",
        },
      ],
      sopTitle: "Purchase Order Approval",
      quizTitle: "Purchase Essentials Quiz",
      passingPercentage: 75,
      courseTitle: "Purchase Team Onboarding",
      courseDescription: "Core procurement workflows for the Purchase department.",
      lessons: [
        {
          title: "PO Lifecycle Overview",
          content: "<h3>PO Lifecycle</h3><p>From requisition to goods receipt — roles and handoffs in Purchase.</p>",
          durationMinutes: 15,
        },
        {
          title: "Vendor Communication Standards",
          content: "<h3>Vendors</h3><p>Professional communication templates and escalation paths.</p>",
          durationMinutes: 20,
        },
        {
          title: "SKU Creative Checklist Walkthrough",
          content:
            "<h3>Packaging Artwork Approval</h3><p>Use the SKU Creative Checklist to verify all 150 checkpoints across product identity, legal metrology, regulatory compliance, barcodes, packaging materials, artwork design, marketplace compliance, and final QA before releasing artwork to print.</p><p>Download the Excel template from the chapter attachments and obtain sign-off from Procurement along with QA, Regulatory, and Brand teams.</p>",
          durationMinutes: 45,
        },
      ],
      pathName: "Purchase Starter Path",
    },
    Inventory: {
      chapters: [
        {
          title: "Stock Receiving Workflow",
          category: "SOP",
          difficulty: "BEGINNER",
          estimatedMinutes: 25,
          content:
            "<h3>Overview</h3><p>Standard receiving process for inbound inventory across all warehouses.</p>",
        },
        {
          title: "Cycle Count Best Practices",
          category: "Process",
          difficulty: "ADVANCED",
          estimatedMinutes: 45,
          content:
            "<h3>Overview</h3><p>Accurate cycle counts reduce shrinkage and improve forecast accuracy.</p>",
        },
      ],
      sopTitle: "Stock Count Procedure",
      quizTitle: "Inventory Basics",
      passingPercentage: 70,
      courseTitle: "Inventory Management Fundamentals",
      courseDescription: "Receiving, storage, and cycle counting for Inventory teams.",
      lessons: [
        {
          title: "Warehouse Layout & Bin Locations",
          content: "<h3>Layout</h3><p>How SKUs are organized and located in Kharesiya warehouses.</p>",
          durationMinutes: 15,
        },
        {
          title: "Receiving & Put-Away",
          content: "<h3>Receiving</h3><p>Scanning, QC checks, and put-away rules for inbound stock.</p>",
          durationMinutes: 25,
        },
      ],
      pathName: "Inventory Starter Path",
    },
    HR: {
      chapters: [
        {
          title: "Employee Onboarding Checklist",
          category: "Onboarding",
          difficulty: "BEGINNER",
          estimatedMinutes: 15,
          content:
            "<h3>Overview</h3><p>HR onboarding steps for every new Kharesiya team member.</p>",
        },
        {
          title: "Leave & Attendance Policy",
          category: "Policy",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content:
            "<h3>Leave Policy</h3><p>How employees request leave, track attendance, and escalate HR issues.</p>",
        },
      ],
      sopTitle: "New Hire Onboarding SOP",
      quizTitle: "HR Policy Quiz",
      passingPercentage: 80,
      courseTitle: "HR Team Playbook",
      courseDescription: "Onboarding, policies, and employee lifecycle for HR.",
      lessons: [
        {
          title: "Day-One Onboarding",
          content: "<h3>Day One</h3><p>Checklist for paperwork, system access, and orientation.</p>",
          durationMinutes: 15,
        },
        {
          title: "Performance Review Cycle",
          content: "<h3>Reviews</h3><p>How quarterly and annual reviews are conducted.</p>",
          durationMinutes: 20,
        },
      ],
      pathName: "HR Starter Path",
    },
    Finance: {
      chapters: [
        {
          title: "Expense Reimbursement Guide",
          category: "Finance",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content:
            "<h3>Expenses</h3><p>How to submit, approve, and track employee expense claims.</p>",
        },
        {
          title: "Month-End Close Checklist",
          category: "Process",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 40,
          content:
            "<h3>Month-End</h3><p>Reconciliation steps, journal entries, and reporting deadlines.</p>",
        },
      ],
      sopTitle: "Invoice Processing SOP",
      quizTitle: "Finance Basics Quiz",
      passingPercentage: 75,
      courseTitle: "Finance Operations Training",
      courseDescription: "AP/AR fundamentals and month-end procedures.",
      lessons: [
        {
          title: "Chart of Accounts Overview",
          content: "<h3>COA</h3><p>Key account categories used across Kharesiya Brands.</p>",
          durationMinutes: 15,
        },
        {
          title: "Vendor Payment Run",
          content: "<h3>Payments</h3><p>Weekly payment batch process and approval matrix.</p>",
          durationMinutes: 25,
        },
      ],
      pathName: "Finance Starter Path",
    },
    Marketing: {
      chapters: [
        {
          title: "Brand Voice & Guidelines",
          category: "Brand",
          difficulty: "BEGINNER",
          estimatedMinutes: 25,
          content:
            "<h3>Brand</h3><p>Tone, visuals, and messaging standards for all Kharesiya marketing.</p>",
        },
        {
          title: "Campaign Launch Checklist",
          category: "Campaigns",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 30,
          content:
            "<h3>Campaigns</h3><p>Steps from brief to launch: assets, channels, tracking, and review.</p>",
        },
      ],
      sopTitle: "Social Media Publishing SOP",
      quizTitle: "Marketing Standards Quiz",
      passingPercentage: 70,
      courseTitle: "Marketing Onboarding",
      courseDescription: "Brand, campaigns, and channel standards for Marketing.",
      lessons: [
        {
          title: "Brand Assets & Templates",
          content: "<h3>Assets</h3><p>Where to find logos, templates, and approved creative files.</p>",
          durationMinutes: 15,
        },
        {
          title: "Campaign Analytics Basics",
          content: "<h3>Analytics</h3><p>Key metrics: reach, CTR, conversion, and ROAS.</p>",
          durationMinutes: 20,
        },
      ],
      pathName: "Marketing Starter Path",
    },
    Operations: {
      chapters: [
        {
          title: "Warehouse Safety Fundamentals",
          category: "Safety",
          difficulty: "BEGINNER",
          estimatedMinutes: 30,
          content:
            "<h3>Overview</h3><p>Essential safety protocols for warehouse and operations staff.</p>",
        },
        {
          title: "Daily Shift Handover",
          category: "Operations",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content:
            "<h3>Handover</h3><p>What to document and communicate between shifts.</p>",
        },
      ],
      sopTitle: "Incident Reporting SOP",
      quizTitle: "Safety Fundamentals",
      passingPercentage: 80,
      courseTitle: "Operations Onboarding",
      courseDescription: "Complete self-paced onboarding for new operations team members.",
      lessons: [
        {
          title: "Welcome to Kharesiya",
          content: "<h3>Welcome</h3><p>Operations standards, safety culture, and team structure.</p>",
          durationMinutes: 10,
        },
        {
          title: "Safety Fundamentals",
          content: "<h3>Safety First</h3><p>Warehouse safety protocols and hazard reporting.</p>",
          durationMinutes: 20,
        },
      ],
      pathName: "Operations Starter Path",
    },
    Quality: {
      chapters: [
        {
          title: "Incoming Inspection Standards",
          category: "Quality",
          difficulty: "BEGINNER",
          estimatedMinutes: 30,
          content:
            "<h3>Inspection</h3><p>Sample sizes, defect categories, and accept/reject criteria.</p>",
        },
        {
          title: "Non-Conformance Reporting",
          category: "Compliance",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 35,
          content:
            "<h3>NCR</h3><p>How to log, investigate, and close non-conformance reports.</p>",
        },
      ],
      sopTitle: "Quality Inspection Protocol",
      quizTitle: "Quality Standards",
      passingPercentage: 75,
      courseTitle: "Quality Assurance Training",
      courseDescription: "Inspection, NCR, and compliance for Quality teams.",
      lessons: [
        {
          title: "QC Tools Overview",
          content: "<h3>Tools</h3><p>Checklists, calipers, and sampling tools used on the floor.</p>",
          durationMinutes: 15,
        },
        {
          title: "Root Cause Analysis",
          content: "<h3>RCA</h3><p>5-Why and fishbone basics for defect investigation.</p>",
          durationMinutes: 25,
        },
      ],
      pathName: "Quality Starter Path",
    },
    "E-commerce": {
      chapters: [
        {
          title: "Returns Processing Guide",
          category: "E-commerce",
          difficulty: "BEGINNER",
          estimatedMinutes: 20,
          content:
            "<h3>Returns</h3><p>How to process customer returns for the E-commerce department.</p>",
        },
        {
          title: "Marketplace Listing Standards",
          category: "E-commerce",
          difficulty: "INTERMEDIATE",
          estimatedMinutes: 30,
          content:
            "<h3>Listings</h3><p>Title, images, attributes, and compliance for online listings.</p>",
        },
      ],
      sopTitle: "Order Fulfillment SOP",
      quizTitle: "E-commerce Operations Quiz",
      passingPercentage: 70,
      courseTitle: "E-commerce Fulfillment Training",
      courseDescription: "Order processing, returns, and fulfillment for E-commerce.",
      lessons: [
        {
          title: "Picking & Packing Standards",
          content: "<h3>Fulfillment</h3><p>Accuracy standards for picking and packing online orders.</p>",
          durationMinutes: 15,
        },
        {
          title: "Customer Service Escalations",
          content: "<h3>Escalations</h3><p>When and how to escalate order issues to team leads.</p>",
          durationMinutes: 20,
        },
      ],
      pathName: "E-commerce Starter Path",
    },
  };

  const defaultQuestions = [
    {
      type: "SINGLE_CHOICE" as const,
      text: "What should you do before starting hands-on work in this module?",
      options: ["Read the overview", "Skip to quiz", "Ignore SOPs"],
      correctAnswer: "Read the overview",
      order: 0,
      points: 1,
    },
    {
      type: "TRUE_FALSE" as const,
      text: "Following department SOPs ensures consistency across teams.",
      correctAnswer: true,
      order: 1,
      points: 1,
    },
  ];

  let chapterCount = 0;
  let sopCount = 0;
  let quizCount = 0;
  let courseCount = 0;
  let pathCount = 0;

  for (const [deptName, content] of Object.entries(departmentContent)) {
    const departmentId = deptByName[deptName];
    if (!departmentId) continue;

    for (const ch of content.chapters) {
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
            authorId: founder.id,
          },
        });
        chapterCount++;
      }
    }

    const existingSop = await prisma.sOP.findFirst({
      where: { title: content.sopTitle, departmentId },
    });
    if (!existingSop) {
      await prisma.sOP.create({
        data: {
          title: content.sopTitle,
          departmentId,
          ownerId: founder.id,
          effectiveDate: new Date(),
          status: "PUBLISHED",
          approvalStatus: "APPROVED",
        },
      });
      sopCount++;
    }

    let quiz = await prisma.quiz.findFirst({
      where: { title: content.quizTitle, departmentId },
    });
    if (!quiz) {
      quiz = await prisma.quiz.create({
        data: {
          title: content.quizTitle,
          departmentId,
          passingPercentage: content.passingPercentage,
          status: "PUBLISHED",
          authorId: founder.id,
          questions: { create: defaultQuestions },
        },
      });
      quizCount++;
    }

    const existingCourse = await prisma.course.findFirst({
      where: { title: content.courseTitle, departmentId },
    });
    if (!existingCourse) {
      await prisma.course.create({
        data: {
          title: content.courseTitle,
          description: content.courseDescription,
          departmentId,
          difficulty: "BEGINNER",
          estimatedHours: 1.5,
          status: "PUBLISHED",
          isSelfPaced: true,
          publishedAt: new Date(),
          authorId: founder.id,
          modules: {
            create: [
              {
                title: `${deptName} Essentials`,
                order: 0,
                lessons: {
                  create: content.lessons.map((lesson, order) => ({
                    title: lesson.title,
                    order,
                    contentType: "TEXT",
                    durationMinutes: lesson.durationMinutes,
                    content: lesson.content,
                  })),
                },
              },
            ],
          },
        },
      });
      courseCount++;
    }

    const firstChapter = await prisma.knowledgeChapter.findFirst({
      where: { departmentId, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
    });

    const existingPath = await prisma.learningPath.findFirst({
      where: { name: content.pathName, departmentId },
    });
    if (!existingPath && firstChapter && quiz) {
      await prisma.learningPath.create({
        data: {
          name: content.pathName,
          description: `Recommended learning path for ${deptName} team members.`,
          departmentId,
          durationDays: 14,
          passingScore: content.passingPercentage,
          status: "PUBLISHED",
          items: {
            create: [
              { chapterId: firstChapter.id, order: 0, isRequired: true, dueDays: 7 },
              { quizId: quiz.id, order: 1, isRequired: true, dueDays: 14 },
            ],
          },
        },
      });
      pathCount++;
    }

    console.log(`✓ Content seeded for ${deptName}`);
  }

  console.log(
    `\n✓ Added ${chapterCount} chapters, ${sopCount} SOPs, ${quizCount} quizzes, ${courseCount} courses, ${pathCount} learning paths`
  );

  const purchaseDept = await prisma.department.findUnique({ where: { name: "Purchase" } });
  if (purchaseDept) {
    const checklistChapter = await prisma.knowledgeChapter.findFirst({
      where: { title: "SKU Creative Checklist", departmentId: purchaseDept.id },
    });
    if (checklistChapter) {
      const existingAttachment = await prisma.attachment.findFirst({
        where: {
          chapterId: checklistChapter.id,
          originalName: SKU_CREATIVE_CHECKLIST_ATTACHMENT.originalName,
        },
      });
      if (!existingAttachment) {
        await prisma.attachment.create({
          data: { ...SKU_CREATIVE_CHECKLIST_ATTACHMENT, chapterId: checklistChapter.id },
        });
        console.log("✓ Attached SKU Creative Checklist.xlsx to Purchase chapter");
      }
    }

    const purchaseCourse = await prisma.course.findFirst({
      where: { title: "Purchase Team Onboarding", departmentId: purchaseDept.id },
      include: { modules: { include: { lessons: true }, orderBy: { order: "asc" } } },
    });
    if (purchaseCourse?.modules[0]) {
      const module = purchaseCourse.modules[0];
      const existingLesson = module.lessons.find((l) => l.title === "SKU Creative Checklist Walkthrough");
      if (!existingLesson) {
        const nextOrder = module.lessons.length
          ? Math.max(...module.lessons.map((l) => l.order)) + 1
          : 0;
        await prisma.lesson.create({
          data: {
            moduleId: module.id,
            title: "SKU Creative Checklist Walkthrough",
            order: nextOrder,
            contentType: "TEXT",
            durationMinutes: 45,
            content:
              "<h3>Packaging Artwork Approval</h3><p>Use the SKU Creative Checklist to verify all 150 checkpoints across product identity, legal metrology, regulatory compliance, barcodes, packaging materials, artwork design, marketplace compliance, and final QA before releasing artwork to print.</p><p>Download the Excel template from the chapter attachments and obtain sign-off from Procurement along with QA, Regulatory, and Brand teams.</p>",
          },
        });
        console.log("✓ Added SKU Creative Checklist lesson to Purchase course");
      }
    }
  }

  if (founder) {
    const sampleTasks = [
      {
        title: "Complete SKU artwork review for Q3 launch",
        description:
          "Review all pending packaging artwork against the SKU Creative Checklist. Coordinate with QA and Regulatory for sign-off before sending to print vendors.",
        departmentName: "Purchase",
        priority: "HIGH" as const,
        dueDays: 14,
      },
      {
        title: "Update vendor onboarding SOP",
        description:
          "Refresh the vendor onboarding documentation to include new compliance requirements and approval matrix.",
        departmentName: "Operations",
        priority: "MEDIUM" as const,
        dueDays: 21,
      },
      {
        title: "Prepare monthly inventory cycle count report",
        description:
          "Run cycle counts across all warehouses and submit variance report with root-cause analysis.",
        departmentName: "Inventory",
        priority: "URGENT" as const,
        dueDays: 7,
      },
    ];

    let taskCount = 0;
    for (const sample of sampleTasks) {
      const dept = await prisma.department.findUnique({ where: { name: sample.departmentName } });
      if (!dept) continue;

      const existing = await prisma.departmentTask.findFirst({
        where: { title: sample.title, departmentId: dept.id },
      });
      if (existing) continue;

      await prisma.departmentTask.create({
        data: {
          title: sample.title,
          description: sample.description,
          departmentId: dept.id,
          assignedById: founder.id,
          priority: sample.priority,
          dueDate: new Date(Date.now() + sample.dueDays * 24 * 60 * 60 * 1000),
          updates: {
            create: {
              userId: founder.id,
              status: "ASSIGNED",
              note: "Task assigned by founder",
            },
          },
        },
      });
      taskCount++;
    }
    if (taskCount > 0) {
      console.log(`✓ Seeded ${taskCount} founder-assigned department tasks`);
    }
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Super Admin: admin@kharesiya.com    / SuperAdmin@123456");
  console.log("  Founder:     founder@kharesiya.com / Founder@123456");
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
