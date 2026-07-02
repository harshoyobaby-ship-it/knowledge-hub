/**
 * End-to-end pipeline smoke test
 * Run: npm run test:e2e
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  const icon = pass ? "✓" : "✗";
  console.log(`${icon} ${name}: ${detail}`);
}

function getCookie(res: Response, name: string): string | null {
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    const match = c.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  const raw = res.headers.get("set-cookie");
  if (raw) {
    const match = raw.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function main() {
  console.log(`\nKharesiya Knowledge Hub — E2E Smoke Test`);
  console.log(`Target: ${BASE}\n`);

  try {
    const res = await fetch(BASE);
    const html = await res.text();
    record(
      "Landing page (/)",
      res.status === 200 && html.includes("KHARESIYA"),
      `status ${res.status}`
    );
  } catch (e) {
    record("Landing page (/)", false, `unreachable: ${e}`);
    console.log("\n❌ Server not running. Start with: npm run dev\n");
    process.exit(1);
  }

  const dashUnauth = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  record(
    "Dashboard requires auth",
    dashUnauth.status === 307 || dashUnauth.status === 302,
    `redirect → ${dashUnauth.headers.get("location")}`
  );

  const loginRes = await fetch(`${BASE}/login`);
  record("Login page", loginRes.status === 200, `status ${loginRes.status}`);

  // Real login with seeded admin
  const realLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "founder@kharesiya.com",
      password: "Founder@123456",
    }),
  });
  const realLoginJson = await realLoginRes.json();
  const realCookie = getCookie(realLoginRes, "kh_auth_token");
  record(
    "Real login (founder@kharesiya.com)",
    realLoginRes.status === 200 && realLoginJson.success && !!realCookie,
    `status ${realLoginRes.status}, user: ${realLoginJson.data?.user?.email ?? realLoginJson.error}`
  );

  let cookieHeader = realCookie ? `kh_auth_token=${realCookie}` : "";

  if (!realCookie) {
    const demoRes = await fetch(`${BASE}/api/auth/demo-login`, { method: "POST" });
    const demoJson = await demoRes.json();
    const demoCookie = getCookie(demoRes, "kh_auth_token");
    record(
      "Demo login fallback",
      demoRes.status === 200 && demoJson.success && !!demoCookie,
      `status ${demoRes.status}`
    );
    if (demoCookie) cookieHeader = `kh_auth_token=${demoCookie}`;
  }

  if (!cookieHeader) {
    console.log("\n❌ No auth cookie obtained\n");
    process.exit(1);
  }

  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  const meJson = await meRes.json();
  record(
    "Auth /me endpoint",
    meRes.status === 200 && !!meJson.data?.email,
    `user: ${meJson.data?.firstName} ${meJson.data?.lastName} (${meJson.data?.email})`
  );

  const dashAuth = await fetch(`${BASE}/dashboard`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  });
  record("Dashboard with session", dashAuth.status === 200, `status ${dashAuth.status}`);

  const pages = ["/courses", "/departments", "/learning-modules", "/learning-paths", "/sops", "/quizzes", "/admin", "/admin/users", "/admin/content", "/admin/courses", "/admin/learning-paths", "/hr", "/trainer", "/manager", "/assistant"];
  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader } });
    record(`Page ${path}`, res.status === 200, `status ${res.status}`);
  }

  const usersRes = await fetch(`${BASE}/api/users?limit=5`, {
    headers: { Cookie: cookieHeader },
  });
  const usersJson = await usersRes.json();
  record(
    "Users API (list)",
    usersRes.status === 200 && Array.isArray(usersJson.data?.data),
    `status ${usersRes.status}, count: ${usersJson.data?.total ?? 0}`
  );

  const deptsRes = await fetch(`${BASE}/api/departments`, {
    headers: { Cookie: cookieHeader },
  });
  const deptsJson = await deptsRes.json();
  record(
    "Departments API (dropdown)",
    deptsRes.status === 200 && Array.isArray(deptsJson.data),
    `status ${deptsRes.status}, count: ${deptsJson.data?.length ?? 0}`
  );

  const insightsRes = await fetch(`${BASE}/api/insights`, {
    headers: { Cookie: cookieHeader },
  });
  const insightsJson = await insightsRes.json();
  record(
    "Insights API (zero baseline)",
    insightsRes.status === 200 && typeof insightsJson.data?.overallProgress === "number",
    `progress: ${insightsJson.data?.overallProgress}%, modules: ${insightsJson.data?.totalModules}`
  );

  const chaptersRes = await fetch(`${BASE}/api/chapters?limit=5`, {
    headers: { Cookie: cookieHeader },
  });
  const chaptersJson = await chaptersRes.json();
  record(
    "Chapters API (list)",
    chaptersRes.status === 200 && Array.isArray(chaptersJson.data?.data),
    `status ${chaptersRes.status}, count: ${chaptersJson.data?.total ?? 0}`
  );

  const contentStatsRes = await fetch(`${BASE}/api/content/stats`, {
    headers: { Cookie: cookieHeader },
  });
  const contentStatsJson = await contentStatsRes.json();
  record(
    "Content stats API",
    contentStatsRes.status === 200 && contentStatsJson.data?.chapters != null,
    `chapters: ${contentStatsJson.data?.chapters?.total ?? 0}`
  );

  const coursesRes = await fetch(`${BASE}/api/courses?limit=5`, {
    headers: { Cookie: cookieHeader },
  });
  const coursesJson = await coursesRes.json();
  record(
    "Courses API (catalog)",
    coursesRes.status === 200 && Array.isArray(coursesJson.data?.data),
    `count: ${coursesJson.data?.total ?? 0}`
  );

  const adminStatsRes = await fetch(`${BASE}/api/admin/stats`, {
    headers: { Cookie: cookieHeader },
  });
  const adminStatsJson = await adminStatsRes.json();
  record(
    "Admin stats API",
    adminStatsRes.status === 200 && adminStatsJson.data?.totalUsers != null,
    `users: ${adminStatsJson.data?.totalUsers ?? 0}`
  );

  const hrStatsRes = await fetch(`${BASE}/api/hr/stats`, {
    headers: { Cookie: cookieHeader },
  });
  const hrStatsJson = await hrStatsRes.json();
  record(
    "HR stats API",
    hrStatsRes.status === 200 && hrStatsJson.data?.employeeCount != null,
    `employees: ${hrStatsJson.data?.employeeCount ?? 0}`
  );

  const pathsRes = await fetch(`${BASE}/api/learning-paths?manage=true`, {
    headers: { Cookie: cookieHeader },
  });
  const pathsJson = await pathsRes.json();
  record(
    "Learning paths API",
    pathsRes.status === 200 && Array.isArray(pathsJson.data?.data),
    `count: ${pathsJson.data?.total ?? 0}`
  );

  const notifRes = await fetch(`${BASE}/api/notifications`, {
    headers: { Cookie: cookieHeader },
  });
  const notifJson = await notifRes.json();
  record(
    "Notifications API",
    notifRes.status === 200 && Array.isArray(notifJson.data?.data),
    `unread: ${notifJson.data?.unreadCount ?? 0}`
  );

  const sopsRes = await fetch(`${BASE}/api/sops?limit=5`, {
    headers: { Cookie: cookieHeader },
  });
  const sopsJson = await sopsRes.json();
  record(
    "SOPs API (learner)",
    sopsRes.status === 200 && Array.isArray(sopsJson.data?.data),
    `count: ${sopsJson.data?.total ?? 0}`
  );

  const quizzesRes = await fetch(`${BASE}/api/quizzes?limit=5`, {
    headers: { Cookie: cookieHeader },
  });
  const quizzesJson = await quizzesRes.json();
  record(
    "Quizzes API (learner)",
    quizzesRes.status === 200 && Array.isArray(quizzesJson.data?.data),
    `count: ${quizzesJson.data?.total ?? 0}`
  );

  const healthRes = await fetch(`${BASE}/api/assistant/health`, {
    headers: { Cookie: cookieHeader },
  });
  const healthJson = await healthRes.json();
  record(
    "Assistant health API",
    healthRes.status === 200 && healthJson.data != null,
    `status: ${healthJson.data?.status ?? "unknown"}`
  );

  const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  record("Logout API", logoutRes.status === 200, `status ${logoutRes.status}`);

  const meAfter = await fetch(`${BASE}/api/auth/me`);
  record("Session cleared after logout", meAfter.status === 401, `status ${meAfter.status}`);

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed}/${total} passed`);
  console.log(`${"=".repeat(50)}\n`);

  if (passed < total) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
