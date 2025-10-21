# E2E Tests

This directory contains end-to-end tests for the web application using Playwright.

## Running Tests

```bash
# Install dependencies (from project root)
pnpm install

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e:ui
```

## Test Structure

- `e2e/speech-generation.spec.ts` - Main E2E tests for speech generation flow
  - Tests PDF upload UI
  - Tests length/tone selector options
  - Tests API integration with mocked OpenAI responses
  - Tests error handling (429 rate limits, API failures)

## Mocking Strategy

The E2E tests use Playwright's `page.route()` to intercept and mock API calls to `/api/generate`. This allows testing the full UI flow without requiring:

- Real OpenAI API key
- Actual API costs
- Network dependencies

Mock responses include realistic:
- `outputs` with generated content
- `usage` token counts
- `cost` estimates
- `meta` with version and limits

## CI Integration

Tests run automatically in GitHub Actions CI pipeline with:
- Chromium browser (headless)
- Mock OpenAI API key
- Artifact upload for test reports

## Adding New Tests

1. Create new `.spec.ts` file in `tests/e2e/`
2. Import `test` and `expect` from `@playwright/test`
3. Use `test.beforeEach()` to set up route mocking
4. Write test cases using `test()` and `expect()`

Example:

```typescript
import { test, expect } from "@playwright/test";

test.describe("New Feature", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    // ... test code
  });
});
```
