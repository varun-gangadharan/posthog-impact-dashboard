import { chromium } from "playwright";

const PASS = "\x1b[32mPASS\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";
let passed = 0;
let failed = 0;

function check(name, ok) {
  if (ok) {
    console.log(`  ${PASS} ${name}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}`);
    failed++;
  }
}

const PORT = process.argv[2] || "4173";
const BASE = `http://localhost:${PORT}`;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const start = Date.now();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".leaderboard-row", { timeout: 15000 });
  const loadTime = Date.now() - start;

  // --- Dashboard Shell ---
  console.log("\n=== Dashboard Shell ===");
  check("Title visible", (await page.textContent("h1"))?.includes("PostHog Engineer Impact Dashboard"));
  check("Caution label visible", (await page.textContent(".caution-label"))?.includes("heuristic"));
  check("Filter controls present", (await page.$$(".filters select")).length >= 3);
  check("Leaderboard region exists", !!(await page.$("[aria-label='Leaderboard']")));
  check("Detail region exists", !!(await page.$("[aria-label='Engineer detail']")));
  check("Evidence region exists", !!(await page.$("[aria-label='Evidence']")));
  check("Methodology section exists", !!(await page.$(".methodology")));

  // --- Leaderboard ---
  console.log("\n=== Leaderboard ===");
  const rows = await page.$$(".leaderboard-row");
  check("Leaderboard has multiple rows (>5)", rows.length > 5);
  check("Results count shown", (await page.textContent(".results-count"))?.includes("engineers"));
  check("Rank 1 selected by default", (await page.textContent(".engineer-detail h2"))?.includes("@"));

  // Click first 3 engineers
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    await rows[i].click();
    await page.waitForTimeout(150);
    const h2 = await page.textContent(".engineer-detail h2");
    check(`Engineer ${i + 1} click updates detail`, h2?.includes("@"));
    check(`Engineer ${i + 1} confidence`, (await page.textContent(".confidence-label"))?.includes("confidence"));
    check(`Engineer ${i + 1} breakdown (4 bars)`, (await page.$$(".breakdown-row")).length === 4);
  }

  // --- Time Window Filter ---
  console.log("\n=== Time Window Filter ===");
  const timeSelect = page.locator(".filters select").first();
  const areaSelect = page.locator(".filters select").nth(1);
  const typeSelect = page.locator(".filters select").nth(2);

  await timeSelect.selectOption("1m");
  await page.waitForTimeout(300);
  const monthRows = await page.$$(".leaderboard-row");
  check("Past month filter: has results", monthRows.length > 0);

  await timeSelect.selectOption("1w");
  await page.waitForTimeout(300);
  const weekRows = await page.$$(".leaderboard-row");
  check("Past week filter: has results", weekRows.length > 0);
  check("Past week has fewer or equal results than month", weekRows.length <= monthRows.length);

  await timeSelect.selectOption("all");
  await page.waitForTimeout(300);

  // --- Area Filters ---
  console.log("\n=== Area Filters ===");
  for (const area of ["Backend", "Frontend", "Product"]) {
    await areaSelect.selectOption(area);
    await page.waitForTimeout(200);
    check(`${area} filter: has results`, (await page.$$(".leaderboard-row")).length > 0);
  }
  await areaSelect.selectOption("All");
  await page.waitForTimeout(200);

  // --- Type Filters ---
  console.log("\n=== Type Filters ===");
  for (const type of ["Bug Fix", "Product Feature"]) {
    await typeSelect.selectOption(type);
    await page.waitForTimeout(200);
    check(`${type} filter: has results`, (await page.$$(".leaderboard-row")).length > 0);
  }
  await typeSelect.selectOption("All");
  await page.waitForTimeout(200);

  // --- Evidence ---
  console.log("\n=== Evidence ===");
  check("Evidence table visible", !!(await page.$(".evidence-table")));
  const ghLinks = await page.$$eval(".evidence-table a[target='_blank']", els =>
    els.map(el => el.getAttribute("href"))
  );
  check("Evidence links point to GitHub", ghLinks.length > 0 && ghLinks.every(h => /^https:\/\/github\.com\/PostHog\/posthog\/(pull|issues)\/\d+$/.test(h)));
  check("Evidence links have rel=noreferrer", await page.$$eval(".evidence-table a[target='_blank']", els =>
    els.every(el => el.getAttribute("rel")?.includes("noreferrer"))
  ));

  // --- Methodology ---
  console.log("\n=== Methodology ===");
  check("Inline caveat visible", (await page.textContent(".methodology-caveat-inline"))?.includes("heuristic"));
  await page.click(".methodology-toggle");
  await page.waitForTimeout(200);
  const meth = await page.textContent(".methodology-content");
  check("Shows Delivery 35%", meth?.includes("35%"));
  check("Shows Product 25%", meth?.includes("Product Proximity") && meth?.includes("25%"));
  check("Confidence labels explained", meth?.includes("High:") && meth?.includes("Medium:") && meth?.includes("Low:"));

  // --- Security + Performance ---
  console.log("\n=== Security + Performance ===");
  const html = await page.content();
  check("No dangerouslySetInnerHTML", !html.includes("dangerouslySetInnerHTML"));
  check("All blank links safe", await page.$$eval("a[target='_blank']", els =>
    els.every(el => el.getAttribute("rel")?.includes("noreferrer"))
  ));
  check("No console errors", consoleErrors.length === 0);
  check(`Load time under 15s (${loadTime}ms)`, loadTime < 15000);

  // --- Footer ---
  console.log("\n=== Footer ===");
  check("Footer shows generation date", (await page.textContent(".dashboard-footer"))?.includes("Data generated"));
  check("Footer shows engineer count", (await page.textContent(".dashboard-footer"))?.includes("engineers scored"));

  // Summary
  if (consoleErrors.length > 0) {
    console.log("\nConsole errors:", consoleErrors);
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
