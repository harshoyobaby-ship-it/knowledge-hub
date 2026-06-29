import { UserRole } from "@prisma/client";

export const demoUser = {
  userId: "demo-user",
  email: "demo@kharesiya.com",
  role: UserRole.EMPLOYEE,
  firstName: "Alex",
  lastName: "Johnson",
  jobTitle: "Operations Associate",
  departmentId: "dept-ops",
  department: { id: "dept-ops", name: "Operations" },
  unreadNotifications: 3,
};

export const demoDashboard = {
  totalModules: 24,
  completedModules: 16,
  pendingModules: 8,
  overallProgress: 67,
  quizScores: [
    { quizTitle: "Safety Fundamentals", score: 92, passed: true },
    { quizTitle: "Inventory Basics", score: 78, passed: true },
    { quizTitle: "Quality Standards", score: 65, passed: false },
  ],
  recentChapters: [
    { id: "1", title: "Warehouse Receiving Process", updatedAt: "2026-06-20" },
    { id: "2", title: "Customer Service Guidelines", updatedAt: "2026-06-18" },
    { id: "3", title: "E-commerce Fulfillment", updatedAt: "2026-06-15" },
  ],
  recentSOPs: [
    { id: "1", title: "Purchase Order Approval", updatedAt: "2026-06-21" },
    { id: "2", title: "Stock Count Procedure", updatedAt: "2026-06-19" },
  ],
  weeklyProgress: [
    { week: "W1", completed: 2 },
    { week: "W2", completed: 4 },
    { week: "W3", completed: 3 },
    { week: "W4", completed: 7 },
  ],
};

export const demoDepartments = [
  { id: "1", name: "Purchase", description: "Procurement and vendor management", status: "ACTIVE", members: 12, head: "Sarah Chen" },
  { id: "2", name: "Inventory", description: "Stock control and warehousing", status: "ACTIVE", members: 18, head: "Mike Torres" },
  { id: "3", name: "HR", description: "Human resources and onboarding", status: "ACTIVE", members: 6, head: "Lisa Park" },
  { id: "4", name: "Finance", description: "Accounting and financial planning", status: "ACTIVE", members: 8, head: "David Kim" },
  { id: "5", name: "Marketing", description: "Brand and digital marketing", status: "ACTIVE", members: 10, head: "Emma Wilson" },
  { id: "6", name: "Operations", description: "Day-to-day business operations", status: "ACTIVE", members: 22, head: "James Lee" },
  { id: "7", name: "Quality", description: "Quality assurance and compliance", status: "ACTIVE", members: 7, head: "Nina Patel" },
  { id: "8", name: "E-commerce", description: "Online sales and fulfillment", status: "ACTIVE", members: 15, head: "Ryan Okafor" },
];

export const demoChapters = [
  { id: "1", title: "Introduction to Purchase Orders", department: "Purchase", difficulty: "BEGINNER", status: "PUBLISHED", estimatedMinutes: 20, category: "Onboarding" },
  { id: "2", title: "Vendor Selection Criteria", department: "Purchase", difficulty: "INTERMEDIATE", status: "PUBLISHED", estimatedMinutes: 35, category: "Process" },
  { id: "3", title: "Stock Receiving Workflow", department: "Inventory", difficulty: "BEGINNER", status: "PUBLISHED", estimatedMinutes: 25, category: "SOP" },
  { id: "4", title: "Cycle Count Best Practices", department: "Inventory", difficulty: "ADVANCED", status: "PUBLISHED", estimatedMinutes: 45, category: "Process" },
  { id: "5", title: "Employee Onboarding Checklist", department: "HR", difficulty: "BEGINNER", status: "PUBLISHED", estimatedMinutes: 15, category: "Onboarding" },
  { id: "6", title: "Financial Reporting Standards", department: "Finance", difficulty: "EXPERT", status: "DRAFT", estimatedMinutes: 60, category: "Compliance" },
];

export const demoSOPs = [
  { id: "1", title: "Purchase Order Approval", department: "Purchase", version: 3, status: "PUBLISHED", owner: "Sarah Chen", effectiveDate: "2026-01-15", reviewDate: "2026-07-15" },
  { id: "2", title: "Stock Count Procedure", department: "Inventory", version: 2, status: "PUBLISHED", owner: "Mike Torres", effectiveDate: "2025-11-01", reviewDate: "2026-05-01" },
  { id: "3", title: "Quality Inspection Protocol", department: "Quality", version: 4, status: "PUBLISHED", owner: "Nina Patel", effectiveDate: "2026-03-01", reviewDate: "2026-09-01" },
  { id: "4", title: "Returns Processing", department: "E-commerce", version: 1, status: "DRAFT", owner: "Ryan Okafor", effectiveDate: "2026-06-01", reviewDate: "2026-12-01" },
];

export const demoQuizzes = [
  { id: "1", title: "Safety Fundamentals", department: "Operations", questions: 15, passingPercentage: 80, status: "PUBLISHED", attempts: 2, maxAttempts: 3, lastScore: 92 },
  { id: "2", title: "Inventory Basics", department: "Inventory", questions: 20, passingPercentage: 70, status: "PUBLISHED", attempts: 1, maxAttempts: 3, lastScore: 78 },
  { id: "3", title: "Quality Standards", department: "Quality", questions: 12, passingPercentage: 75, status: "PUBLISHED", attempts: 3, maxAttempts: 3, lastScore: 65 },
];

export const demoNotifications = [
  { id: "1", type: "LEARNING_ASSIGNMENT", title: "New module assigned", message: "Complete 'Vendor Selection Criteria' by June 30", read: false, createdAt: "2026-06-22" },
  { id: "2", type: "UPDATED_SOP", title: "SOP updated", message: "Purchase Order Approval v3 is now effective", read: false, createdAt: "2026-06-21" },
  { id: "3", type: "QUIZ_DUE", title: "Quiz due soon", message: "Quality Standards quiz due in 2 days", read: true, createdAt: "2026-06-20" },
  { id: "4", type: "ANNOUNCEMENT", title: "Company update", message: "New learning paths available for Q3 onboarding", read: true, createdAt: "2026-06-18" },
];

export const demoAdminStats = {
  totalUsers: 50,
  totalDepartments: 8,
  totalChapters: 100,
  totalSOPs: 25,
  totalQuizzes: 30,
  completionRate: 72,
};

export const demoHRStats = {
  employeeCount: 50,
  departmentDistribution: demoDepartments.map((d) => ({ name: d.name, count: d.members })),
  completionRates: demoDepartments.map((d) => ({ department: d.name, rate: 60 + Math.floor(Math.random() * 30) })),
  overdueLearning: 7,
  topPerformers: [
    { name: "Alex Johnson", progress: 92 },
    { name: "Maria Garcia", progress: 88 },
    { name: "Tom Bradley", progress: 85 },
  ],
};
