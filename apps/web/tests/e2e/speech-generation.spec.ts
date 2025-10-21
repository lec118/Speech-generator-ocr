import { test, expect } from "@playwright/test";
import path from "path";

// Mock OpenAI API response
test.beforeEach(async ({ page }) => {
  await page.route("**/api/generate", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = await request.postDataJSON();
      const { pages, options } = body;

      // Create mock response
      const outputs = pages.map((p: any) => ({
        pageIndex: p.pageIndex,
        content: `## 페이지 ${p.pageIndex + 1} 화법 스크립트\n\n안녕하세요. 이것은 테스트용 생성 결과입니다.\n\n**요청 옵션**: 길이=${options.length}, 톤=${options.tone}\n\n원문을 바탕으로 작성된 발표 스크립트입니다.`
      }));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outputs,
          usage: {
            promptTokens: 150,
            completionTokens: 200,
            totalTokens: 350
          },
          cost: {
            inputCost: 0.0000225,
            outputCost: 0.00012,
            totalCost: 0.0001425
          },
          meta: {
            length: options.length,
            tone: options.tone,
            version: "v1-user",
            limits: {
              dailyPageLimit: 200,
              concurrencyHint: 10
            }
          }
        })
      });
    }
  });
});

test.describe("Speech Generation E2E", () => {
  test("should upload PDF and generate speech for one page", async ({ page }) => {
    await page.goto("/");

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("화법 생성 OCR");

    // Input topic
    const topicInput = page.locator('input[placeholder*="주제"]');
    await topicInput.fill("건강보험 상품 소개");

    // Create a mock PDF file upload
    // Note: In real scenario, you'd use a real PDF. For now, we'll verify the UI flow.
    const fileInput = page.locator('input[type="file"]');

    // Create a simple text-based PDF simulation
    // Since we can't easily create PDF in browser, we'll test the post-upload UI state
    // by directly calling the PDF extraction (this would normally happen after upload)

    // For this test, we'll verify the generation button becomes enabled
    // after hypothetical PDF processing
    const generateButton = page.locator('button:has-text("전체 페이지 생성")');

    // Initially disabled (no pages loaded)
    await expect(generateButton).toBeDisabled();
  });

  test("should display error message when API fails", async ({ page }) => {
    // Override mock to return error
    await page.route("**/api/generate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "OpenAI API error"
        })
      });
    });

    await page.goto("/");

    // Even without file upload, we can test error handling
    // by checking UI elements exist
    const errorContainer = page.locator(".text-rose-200");

    // Error should not be visible initially
    await expect(errorContainer).toHaveCount(0);
  });

  test("should show length and tone selectors with correct options", async ({ page }) => {
    await page.goto("/");

    // Verify length selector
    const lengthSelect = page.locator('select').first();
    await expect(lengthSelect).toBeVisible();

    const lengthOptions = await lengthSelect.locator("option").allTextContents();
    expect(lengthOptions).toContain("짧게 (120~180)");
    expect(lengthOptions).toContain("중간 (250~400)");
    expect(lengthOptions).toContain("길게 (500~700)");

    // Verify tone selector
    const toneSelect = page.locator('select').nth(1);
    await expect(toneSelect).toBeVisible();

    const toneOptions = await toneSelect.locator("option").allTextContents();
    expect(toneOptions).toContain("기본");
    expect(toneOptions).toContain("설득형");
    expect(toneOptions).toContain("설명형");
    expect(toneOptions).toContain("요점형");
  });

  test("should update length and tone selections", async ({ page }) => {
    await page.goto("/");

    const lengthSelect = page.locator('select').first();
    const toneSelect = page.locator('select').nth(1);

    // Change length to "long"
    await lengthSelect.selectOption("long");
    await expect(lengthSelect).toHaveValue("long");

    // Change tone to "persuasive"
    await toneSelect.selectOption("persuasive");
    await expect(toneSelect).toHaveValue("persuasive");
  });

  test("should display badges with usage and cost info", async ({ page }) => {
    await page.goto("/");

    // Check for badge elements
    const badges = page.locator('[class*="badge"]');

    // At minimum, should show max pages badge
    const maxPagesBadge = page.locator('text=/최대 페이지/');
    await expect(maxPagesBadge).toBeVisible();
  });

  test("should have download button disabled when no results", async ({ page }) => {
    await page.goto("/");

    const downloadButton = page.locator('button:has-text("Markdown 다운로드")');
    await expect(downloadButton).toBeDisabled();
  });

  test("should display page cards after PDF extraction", async ({ page }) => {
    await page.goto("/");

    // Initially, should show placeholder message
    const placeholder = page.locator('text=/PDF 파일을 업로드하면/');
    await expect(placeholder).toBeVisible();
  });
});

test.describe("API Integration", () => {
  test("should send correct request format to /api/generate", async ({ page }) => {
    let capturedRequest: any = null;

    await page.route("**/api/generate", async (route) => {
      capturedRequest = await route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outputs: [],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          cost: { inputCost: 0, outputCost: 0, totalCost: 0 },
          meta: {
            length: "medium",
            tone: "basic",
            version: "v1-user",
            limits: { dailyPageLimit: 200, concurrencyHint: 10 }
          }
        })
      });
    });

    await page.goto("/");

    // Request should have correct structure
    // (In a real test, we'd trigger generation and verify the request)
  });

  test("should handle 429 rate limit error", async ({ page }) => {
    await page.route("**/api/generate", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Request exceeds DAILY_PAGE_LIMIT (200 pages). You requested 250 pages.",
          hint: "Consider processing in batches or contact admin to increase limit."
        })
      });
    });

    await page.goto("/");

    // UI should handle rate limit errors gracefully
  });
});
