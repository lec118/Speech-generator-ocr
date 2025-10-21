# Core Package Unit Tests

This directory contains unit tests for the `@repo/core` package using Vitest.

## Running Tests

```bash
# From project root
pnpm test

# Watch mode
cd packages/core
pnpm test:watch
```

## Test Coverage

### `prompt.test.ts`
Tests for the `buildPrompt()` function:
- ✅ Topic handling (provided vs. default)
- ✅ Page index (0-based to 1-based conversion)
- ✅ Length options (short/medium/long) with token ranges
- ✅ Tone options (basic/persuasive/explanatory/bullet)
- ✅ Style prompt placeholder inclusion
- ✅ Text truncation (MAX_SOURCE_CHARS = 6000)
- ✅ Empty text fallback
- ✅ Default values (medium length, basic tone)
- ✅ Combined options

### `tokens.test.ts`
Tests for token estimation utilities:
- ✅ `estimateTokenCount()`: Korean/English/mixed text
- ✅ `summarizeKoreanText()`: Truncation with sentence boundaries
- ✅ Safety margin application (90%)
- ✅ Punctuation preservation
- ✅ Edge cases (empty text, very small targets)

## Test Philosophy

- **No external dependencies**: Tests use only Vitest, no mocking libraries needed
- **Fast execution**: Pure function tests run in milliseconds
- **Comprehensive coverage**: All public API functions covered
- **Edge case testing**: Empty strings, very long text, boundary conditions

## CI Integration

Unit tests run in GitHub Actions before build step. Tests must pass for PR to merge.
