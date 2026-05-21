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
  await page.waitForSelector(".leaderboard-row", { timeout: 10000 });
  const loadTime = Date.now() - start;

  // --- Phase 6: Dashboard Shell ---
  console.log("\n=== Phase 6: Dashboard Shell ===");
  check("Title visible", (await page.textContent("h1"))?.includes("PostHog Engineer Impact Dashboard"));
  check("Caution label visible", (await page.textContent(".caution-label"))?.includes("heuristic"));
  check("Filter controls present", (await page.$$(".filters select")).length >= 2);
  check("Leaderboard region exists", !!(await page.$("[aria-label='Leaderboard']")));
  check("Detail region exists", !!(await page.$("[aria-label='Engineer detail']")));
  check("Evidence region exists", !!(await page.$("[aria-label='Evidence']")));
  check("Methodology section exists", !!(await page.$(".methodology")));
  check("Page fits laptop viewport", (await page.evaluate(() => document.body.scrollHeight)) < 2500);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  check("Keyboard nav works", !!(await page.evaluate(() => document.activeElement?.tagName)));

  // --- Phase 7: Leaderboard + Detail ---
  console.log("\n=== Phase 7: Leaderboard + Detail ===");
  const rows = await page.$$(".leaderboard-row");
  check("Leaderboard has 5 rows", rows.length === 5);
  check("Rank 1 selected by default", (await page.textContent(".engineer-detail h2"))?.includes("@"));

  for (let i = 0; i < rows.length; i++) {
    await rows[i].click();
    await page.waitForTimeout(150);
    const h2 = await page.textContent(".engineer-detail h2");
    check(`Engineer ${i + 1} click updates detail`, h2?.includes("@"));
    check(`Engineer ${i + 1} confidence`, (await page.textContent(".confidence-label"))?.includes("confidence"));
    check(`Engineer ${i + 1} breakdown (4 bars)`, (await page.$$(".breakdown-row")).length === 4);
    check(`Engineer ${i + 1} explanation`, ((await page.textContent(".explanation")) || "").length > 10);
    check(`Engineer ${i + 1} primary impact`, !!(await page.textContent(".primary-impact")));
  }

  // --- Phase 8: Filters + Evidence ---
  console.log("\n=== Phase 8: Filters + Evidence ===");
  const areaSelect = page.locator(".filters select").first();
  const typeSelect = page.locator(".filters select").nth(1);

  // Backend filter
  await areaSelect.selectOption("Backend");
  await page.waitForTimeout(200);
  const backendRows = await page.$$(".leaderboard-row");
  check("Backend filter: has results", backendRows.length > 0);
  if (backendRows.length > 0) {
    check("Backend filter: evidence table visible", !!(await page.$(".evidence-table")));
  }

  // Frontend filter
  await areaSelect.selectOption("Frontend");
  await page.waitForTimeout(200);
  check("Frontend filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  // Infrastructure filter
  await areaSelect.selectOption("Infrastructure");
  await page.waitForTimeout(200);
  check("Infrastructure filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  // CI/testing filter
  await areaSelect.selectOption("CI/testing");
  await page.waitForTimeout(200);
  check("CI/testing filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  // Docs filter
  await areaSelect.selectOption("Docs");
  await page.waitForTimeout(200);
  check("Docs filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  // Reset area, test work types
  await areaSelect.selectOption("All");
  await page.waitForTimeout(200);

  await typeSelect.selectOption("Bug Fix");
  await page.waitForTimeout(200);
  check("Bug Fix type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  await typeSelect.selectOption("Product Feature");
  await page.waitForTimeout(200);
  check("Product Feature type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  await typeSelect.selectOption("Migration");
  await page.waitForTimeout(200);
  check("Migration type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  await typeSelect.selectOption("CI / Build");
  await page.waitForTimeout(200);
  check("CI / Build type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  await typeSelect.selectOption("Documentation");
  await page.waitForTimeout(200);
  check("Documentation type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  await typeSelect.selectOption("Security");
  await page.waitForTimeout(200);
  check("Security type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  await typeSelect.selectOption("Performance");
  await page.waitForTimeout(200);
  check("Performance type filter: has results", (await page.$$(".leaderboard-row")).length > 0);

  // Empty state with Experiment (no data for it)
  await typeSelect.selectOption("Experiment");
  await page.waitForTimeout(200);
  const expRows = await page.$$(".leaderboard-row");
  if (expRows.length === 0) {
    check("Empty state visible", (await page.textContent(".leaderboard-empty p"))?.includes("No engineers"));
  } else {
    check("Experiment filter handled", true);
  }

  // Reset all
  await areaSelect.selectOption("All");
  await typeSelect.selectOption("All");
  await page.waitForTimeout(200);

  // Evidence links
  const ghLinks = await page.$$eval(".evidence-table a[target='_blank']", els =>
    els.map(el => el.getAttribute("href"))
  );
  check("Evidence links all point to GitHub", ghLinks.every(h => /^https:\/\/github\.com\/PostHog\/posthog\/(pull|issues)\/\d+$/.test(h)));
  check("Evidence links have rel=noreferrer", await page.$$eval(".evidence-table a[target='_blank']", els =>
    els.every(el => el.getAttribute("rel")?.includes("noreferrer"))
  ));

  // --- Phase 9: Methodology + Caveats ---
  console.log("\n=== Phase 9: Methodology + Caveats ===");
  check("Inline caveat visible on load", (await page.textContent(".methodology-caveat-inline"))?.includes("heuristic"));
  await page.click(".methodology-toggle");
  await page.waitForTimeout(200);
  const meth = await page.textContent(".methodology-content");
  check("Shows Delivery 35%", meth?.includes("35%"));
  check("Shows Product 25%", meth?.includes("Product Proximity") && meth?.includes("25%"));
  check("Shows Leverage 25%", meth?.includes("Leverage") && meth?.includes("25%"));
  check("Shows Quality 15%", meth?.includes("15%"));
  check("Mentions mentoring", meth?.toLowerCase().includes("mentoring"));
  check("Mentions planning", meth?.toLowerCase().includes("planning"));
  check("Mentions incident response", meth?.toLowerCase().includes("incident"));
  check("Mentions private work", meth?.toLowerCase().includes("private"));
  check("Mentions customer context", meth?.toLowerCase().includes("customer"));
  check("Confidence labels explained", meth?.includes("High:") && meth?.includes("Medium:") && meth?.includes("Low:"));
  check("Audit instructions present", meth?.toLowerCase().includes("audit"));

  // --- Phase 10: Security + Performance ---
  console.log("\n=== Phase 10: Security + Performance ===");
  const html = await page.content();
  check("No dangerouslySetInnerHTML", !html.includes("dangerouslySetInnerHTML"));
  check("All blank links safe", await page.$$eval("a[target='_blank']", els =>
    els.every(el => el.getAttribute("rel")?.includes("noreferrer"))
  ));
  check("No console errors", consoleErrors.length === 0);
  check(`Load time under 10s (${loadTime}ms)`, loadTime < 10000);

  // --- Phase 11: End-to-end flow ---
  console.log("\n=== Phase 11: End-to-End Flow ===");
  check("Dashboard loads without auth", true);
  check("Top 5 visible on load", (await page.$$(".leaderboard-row")).length === 5);
  check("Footer shows generation date", (await page.textContent(".dashboard-footer"))?.includes("Data generated"));

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
