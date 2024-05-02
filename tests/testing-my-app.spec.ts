import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHtmlReport } from "axe-html-reporter";
import fs from "fs";

const urls = [
  "https://localhost:3698/auth/login",
  "https://localhost:3698/help/release-notes",
];

const urlsRequireLogin = [
  "https://localhost:3698/dashboard",
  "https://localhost:3698/query",
  "https://localhost:3698/accounts",
];

async function performLogin(
  page,
  loginUrl,
  usernameSelector,
  passwordSelector,
  loginButtonSelector,
  username,
  password
) {
  await page.goto(loginUrl);
  await page.fill(usernameSelector, username);
  await page.fill(passwordSelector, password);
  await Promise.all([
    page.waitForNavigation(),
    page.click(loginButtonSelector),
  ]);

  const userInfo = await page.$eval("#userInfo", (el) => el.textContent.trim());
  if (!userInfo) {
    throw new Error("Login failed");
  }
}

async function runAccessibilityCheck(page, url, tags) {
  await page.goto(url);

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(tags)
    .analyze();

  const reportHTML = createHtmlReport({
    results: accessibilityScanResults,
    options: { projectKey: "accessibility-check" },
  });

  const reportPath = `build/reports/accessibility-report-${url.replace(
    /[^a-z0-9]/gi,
    "_"
  )}.html`;
  fs.mkdirSync("build/reports", { recursive: true });
  fs.writeFileSync(reportPath, reportHTML);

  expect(accessibilityScanResults.violations).toEqual([]);
}

test.describe("accessibility check", () => {
  urls.forEach((url) => {
    test(`Verify there is no accessibility issues at ${url}`, async ({
      page,
    }) => {
      await runAccessibilityCheck(page, url, [
        "wcag2a",
        "wcag21a",
        "wcag21aa",
        "wcag2aa",
      ]);
    });
  });

  urlsRequireLogin.forEach((url) => {
    test(`Verify there is no accessibility issues at ${url} after login`, async ({
      page,
    }) => {
      await performLogin(page, "https://localhost:3698/auth/login", "#username", "#password", "#loginBtn", "Administrator", "1234");
      await runAccessibilityCheck(page, url, [
        "wcag2a",
        "wcag21a",
        "wcag21aa",
        "wcag2aa",
      ]);
    });
  });
});
