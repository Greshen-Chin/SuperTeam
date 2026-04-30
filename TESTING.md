# VidChain Testing Guide

Three test layers, one philosophy: **the demo cannot fail on stage.**

| Layer | Tool | Where | Run with |
|---|---|---|---|
| Unit | Vitest | every package's `src/**/*.test.ts` or `tests/unit/` | `pnpm test` |
| Integration | Vitest + msw + supertest | `frontend/src/server/**/*.test.ts` | `pnpm test` |
| End-to-end | Playwright | `frontend/tests/e2e/*.spec.ts` | `pnpm test:e2e` |
| On-chain | Anchor (mocha) | `blockchain/tests/*.ts` | `pnpm anchor:test` |

The Playwright e2e is the **submission gate** — it has to be green before you ship.

---

## Table of Contents

1. [Test Pyramid](#test-pyramid)
2. [Unit Tests (Vitest)](#unit-tests-vitest)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests (Playwright)](#end-to-end-tests-playwright)
5. [Anchor Program Tests](#anchor-program-tests)
6. [Demo Dataset](#demo-dataset)
7. [Mocking the Wallet](#mocking-the-wallet)
8. [CI Pipeline](#ci-pipeline)
9. [Coverage & Required Specs](#coverage--required-specs)
10. [Debugging Failed Specs](#debugging-failed-specs)

---

## Test Pyramid

```text
                ▲
               ╱ ╲
              ╱E2E╲          ← few, slow, high-value: register + verify + certificate
             ╱─────╲
            ╱  Int. ╲        ← API routes against mocked DB / chain
           ╱─────────╲
          ╱   Unit    ╲      ← many, fast, deterministic: hashing, matching, schemas
         ╱─────────────╲
```

**Rules:**

- A bug found in production becomes a unit test. Always.
- A user-facing flow gets an e2e spec. Always.
- A schema becomes a `roundTrip` parse test the day it's written. Always.

---

## Unit Tests (Vitest)

### Why Vitest

ESM-native, drop-in Jest API, ~3× faster than Jest, watch mode reloads in <100 ms.

### Setup (per package)

```bash
pnpm add -D vitest @vitest/coverage-v8

# For React component tests in frontend
pnpm add -D @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react
```

`vitest.config.ts` (frontend):

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: { provider: "v8", reporter: ["text", "html"], thresholds: { lines: 70 } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

`tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`vitest.config.ts` (fingerprinting / shared / bot — node env):

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", globals: true } });
```

### Conventions

- Colocate as `src/foo.test.ts` next to `src/foo.ts`. Use `tests/unit/` for cross-cutting tests.
- Filename: `<unit-under-test>.test.ts`.
- One `describe` per export. Each `it` is one scenario, named `does X when Y`.
- Use `expect(actual).toEqual(expected)` for deep equality, `toBe` for strict equality.
- No network. No Solana RPC. No Postgres. Mock at the boundary with `vi.mock()`.

### Example — pure logic

```ts
// fingerprinting/src/matcher.test.ts
import { describe, it, expect } from "vitest";
import { hammingDistance, framesMatchedRatio } from "./matcher";

describe("hammingDistance", () => {
  it("returns 0 for identical 16-hex strings", () => {
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });
  it("returns 1 for one-bit difference", () => {
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1);
  });
});

describe("framesMatchedRatio", () => {
  it("aligns shorter inside longer (sliding window)", () => {
    const a = ["aaaa000000000000", "bbbb000000000000"];
    const b = ["1111111111111111", "aaaa000000000000", "bbbb000000000000", "2222222222222222"];
    expect(framesMatchedRatio(a, b, 0)).toBe(1);
  });
});
```

### Example — Zod schema

```ts
// shared/src/schemas.test.ts
import { describe, it, expect } from "vitest";
import { proofSchema } from "./schemas";
import { sampleProof } from "../tests/fixtures";

describe("proofSchema", () => {
  it("round-trips a valid proof", () => {
    const json = JSON.stringify(sampleProof);
    expect(proofSchema.parse(JSON.parse(json))).toEqual(sampleProof);
  });
  it("rejects sha256 with wrong length", () => {
    expect(() => proofSchema.parse({ ...sampleProof, sha256: "abc" })).toThrow();
  });
});
```

### Example — React hook

```tsx
// frontend/src/features/register/use-register-video-flow.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRegisterVideoFlow } from "./use-register-video-flow";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    createFingerprint: vi.fn().mockResolvedValue({ sha256: "a".repeat(64), ... }),
    registerProof:     vi.fn().mockResolvedValue({ id: "proof_1", ... }),
  },
}));

describe("useRegisterVideoFlow", () => {
  it("transitions idle → file_selected on selectFile", () => {
    const { result } = renderHook(() => useRegisterVideoFlow());
    act(() => result.current.selectFile(new File([new Uint8Array(1024)], "v.mp4")));
    expect(result.current.state.kind).toBe("file_selected");
  });
});
```

---

## Integration Tests

API routes against mocked DB and Solana — fast, deterministic, no network.

```ts
// frontend/src/app/api/proofs/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/server/repositories/proof-repository", () => ({
  proofRepository: { create: vi.fn().mockResolvedValue({ id: "proof_1", ... }) }
}));
vi.mock("@/server/solana/verify-tx", () => ({ verifyTx: vi.fn().mockResolvedValue(true) }));

describe("POST /api/proofs", () => {
  it("creates a proof and returns the envelope", async () => {
    const req = new Request("http://test/api/proofs", {
      method: "POST",
      body: JSON.stringify(sampleCreateProofBody),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("proof_1");
  });

  it("returns VALIDATION_FAILED for missing title", async () => {
    const req = new Request("http://test/api/proofs", {
      method: "POST",
      body: JSON.stringify({ ...sampleCreateProofBody, title: undefined }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_FAILED");
  });
});
```

For end-to-end backend tests against a real Postgres, use Prisma's test environment:

```bash
DATABASE_URL=postgresql://localhost:54322/vidchain_test pnpm test
```

---

## End-to-End Tests (Playwright)

### Why Playwright

- Cross-browser (Chromium, WebKit, Firefox).
- Native video recording (priceless when a spec fails on CI).
- Network stubbing built-in.
- TypeScript-first.
- Fast: parallel by default.

### Setup

```bash
cd frontend
pnpm add -D @playwright/test
pnpm exec playwright install chromium     # browser binary; use --with-deps on Linux/CI
```

`frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_USE_MOCK_API: "true",
      NEXT_PUBLIC_USE_MOCK_CHAIN: "true",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone",   use: { ...devices["iPhone 14"] } },     // creator UX must work on mobile
  ],
});
```

`frontend/package.json` scripts:

```json
{
  "scripts": {
    "test:e2e":        "playwright test",
    "test:e2e:ui":     "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

### Folder layout

```text
frontend/tests/e2e/
├── fixtures/
│   ├── pages.ts                  # Page Object helpers
│   └── wallet.ts                 # mock wallet injection
├── register-flow.spec.ts
├── verify-flow.spec.ts
├── certificate-share.spec.ts
└── home.spec.ts
```

### Page Object pattern

Keep selectors out of specs. Tests read like sentences.

```ts
// frontend/tests/e2e/fixtures/pages.ts
import type { Page } from "@playwright/test";
import path from "node:path";

const fixture = (name: string) => path.join(__dirname, "..", "..", "..", "fixtures", "demo", name);

export class RegisterPage {
  constructor(private page: Page) {}
  async goto()                   { await this.page.goto("/register"); }
  async uploadOriginal()          { await this.page.setInputFiles('[data-testid="video-input"]', fixture("original.mp4")); }
  async fillTitle(t: string)      { await this.page.fill('[data-testid="title-input"]', t); }
  async submit()                  { await this.page.click('[data-testid="register-submit"]'); }
  async waitForCertificate()      { await this.page.waitForURL(/\/certificate\//); }
}

export class VerifyPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto("/verify"); }
  async upload(name: "original.mp4" | "original-reencoded.mp4" | "unrelated.mp4") {
    await this.page.setInputFiles('[data-testid="video-input"]', fixture(name));
  }
  resultBadge()         { return this.page.getByTestId("match-type-badge"); }
  confidenceMeter()     { return this.page.getByTestId("confidence-meter"); }
}
```

### Critical specs (must pass before submission)

```ts
// frontend/tests/e2e/register-flow.spec.ts
import { test, expect } from "@playwright/test";
import { RegisterPage } from "./fixtures/pages";

test("creator registers an original video and lands on certificate", async ({ page }) => {
  const r = new RegisterPage(page);
  await r.goto();
  await r.uploadOriginal();
  await r.fillTitle("My Demo Dance");
  await r.submit();
  await r.waitForCertificate();

  await expect(page.getByTestId("certificate-title")).toHaveText("My Demo Dance");
  await expect(page.getByTestId("solana-explorer-link")).toHaveAttribute("href", /explorer\.solana\.com/);
});
```

```ts
// frontend/tests/e2e/verify-flow.spec.ts
import { test, expect } from "@playwright/test";
import { VerifyPage } from "./fixtures/pages";

test.describe("verify", () => {
  test("re-encoded copy matches the original", async ({ page }) => {
    const v = new VerifyPage(page);
    await v.goto();
    await v.upload("original-reencoded.mp4");
    await expect(v.resultBadge()).toHaveText(/Likely Match Found/);
    const score = Number(await v.confidenceMeter().getAttribute("data-confidence"));
    expect(score).toBeGreaterThanOrEqual(0.85);
  });

  test("unrelated video returns no match", async ({ page }) => {
    const v = new VerifyPage(page);
    await v.goto();
    await v.upload("unrelated.mp4");
    await expect(v.resultBadge()).toHaveText(/No Registered Origin Found/);
  });
});
```

```ts
// frontend/tests/e2e/certificate-share.spec.ts
import { test, expect } from "@playwright/test";

test("certificate has Open Graph tags for share previews", async ({ page }) => {
  await page.goto("/certificate/proof_demo");                     // SSR + mock data
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /VidChain/i);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\.png$/);
});

test("certificate page loads without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const res = await page.goto("/certificate/proof_demo");
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId("certificate-title")).toBeVisible();
});
```

### Stable selectors

Use `data-testid` attributes — never CSS classes (Tailwind churn breaks them) or text (i18n + copy churn).

```tsx
<button data-testid="register-submit" onClick={onSubmit}>Register Video</button>
```

### Network stubs

If the backend is slow or not deployed yet, stub `/api/*`:

```ts
test.beforeEach(async ({ page }) => {
  await page.route("**/api/proofs/verify", async (route) => {
    await route.fulfill({ json: { success: true, data: { matchType: "visual", confidence: 0.92, ... }, error: null, requestId: "test" } });
  });
});
```

---

## Anchor Program Tests

```bash
# starts a local validator, deploys the program, runs mocha specs
pnpm anchor:test

# run a single file
cd blockchain && anchor test -- --grep "register_proof"
```

Specs live in `blockchain/tests/`. See [blockchain/instruction.md](blockchain/instruction.md#testing) for templates.

CI runs `anchor build` on every PR, `anchor test` on merges to `main`.

---

## Demo Dataset

`frontend/fixtures/demo/`:

| File | Purpose |
|---|---|
| `original.mp4` | The "true original" video used for register specs and the demo. Keep ≤ 5 MB. |
| `original-reencoded.mp4` | Same content as `original.mp4` after HandBrake re-encoding. Different SHA-256, same pHash. |
| `original-trimmed.mp4` | First 3 s removed. Tests sliding-window pHash. |
| `unrelated.mp4` | Different content, similar duration. |
| `tiny.mp4` | < 100 KB clip used by Vitest fingerprinting tests. |

Generate the re-encoded fixture once and commit it:

```bash
HandBrakeCLI -i fixtures/demo/original.mp4 -o fixtures/demo/original-reencoded.mp4 \
  --preset "Fast 720p30" -B 96
ffmpeg -ss 3 -i fixtures/demo/original.mp4 -c copy fixtures/demo/original-trimmed.mp4
```

> Pre-stage the dataset on Day 1. Do not generate fixtures during a hackathon-final test run.

---

## Mocking the Wallet

Production e2e mode uses `NEXT_PUBLIC_USE_MOCK_CHAIN=true` so no real wallet is needed. For specs that exercise the *Wallet Adapter* itself, inject a fake wallet:

```ts
// frontend/tests/e2e/fixtures/wallet.ts
import type { Page } from "@playwright/test";

export async function injectFakeWallet(page: Page, publicKeyBase58: string) {
  await page.addInitScript((pk) => {
    (window as any).solana = {
      isPhantom: true,
      publicKey: { toBase58: () => pk, toBuffer: () => new Uint8Array(32) },
      isConnected: true,
      connect:  async () => ({ publicKey: { toBase58: () => pk } }),
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
      signMessage: async (msg: Uint8Array) => ({ signature: new Uint8Array(64), publicKey: { toBase58: () => pk } }),
    };
  }, publicKeyBase58);
}
```

Use it:

```ts
test.beforeEach(async ({ page }) => {
  await injectFakeWallet(page, "VcHn9E2NmF3uP8KoLq21xProofCreatorWalletSolana");
});
```

---

## CI Pipeline

`.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint-typecheck-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    needs: lint-typecheck-unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
        env:
          NEXT_PUBLIC_USE_MOCK_API: "true"
          NEXT_PUBLIC_USE_MOCK_CHAIN: "true"
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/

  anchor-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            blockchain/target
          key: ${{ runner.os }}-anchor-${{ hashFiles('blockchain/Cargo.lock') }}
      - uses: metaDAOproject/setup-anchor@v3
        with: { anchor-version: 0.30.1, solana-cli-version: 1.18.17 }
      - run: cd blockchain && anchor build
```

A green PR triggers a Vercel preview deployment automatically (Vercel's GitHub integration).

---

## Coverage & Required Specs

Hard checklist before submission:

| Layer | Spec | Owner |
|---|---|---|
| Unit | `sha256` deterministic | fingerprinting |
| Unit | `hammingDistance` | fingerprinting |
| Unit | `framesMatchedRatio` sliding window | fingerprinting |
| Unit | `proofSchema` round-trip | shared |
| Unit | `verificationResultSchema` round-trip | shared |
| Unit | `apiClient.registerProof` parses response | frontend |
| Integration | `POST /api/proofs` validates body | backend |
| Integration | `POST /api/proofs/verify` returns visual match for re-encoded | backend |
| E2E | Register original → certificate URL | frontend |
| E2E | Verify re-encoded → "Likely Match Found" | frontend |
| E2E | Verify unrelated → "No Registered Origin Found" | frontend |
| E2E | Certificate loads without JS | frontend |
| Anchor | `register_proof` creates PDA | blockchain |
| Anchor | rejects metadata_uri > 200 chars | blockchain |

Coverage thresholds: aim for **70% lines** in `fingerprinting/` and `shared/`. Don't chase coverage in `features/` — chase Playwright instead.

---

## Debugging Failed Specs

### Vitest

```bash
pnpm test --watch                           # watch mode
pnpm test path/to/file.test.ts -t "name"    # run one test by name
pnpm test --reporter=verbose                # full output
```

Use `console.log` freely in test files; remove from production code only.

### Playwright

```bash
pnpm test:e2e --ui                                 # GUI inspector
pnpm test:e2e --debug                              # step through
pnpm test:e2e tests/e2e/verify-flow.spec.ts        # run one file
pnpm test:e2e --headed --browser=chromium          # see the browser
pnpm exec playwright show-report                   # open last HTML report
```

When CI fails, download the `playwright-report` artifact from the GitHub Actions run — it contains screenshots, videos, and the trace viewer for every failed test.

### Anchor

```bash
RUST_LOG=debug anchor test                # verbose Rust logs
anchor test --skip-local-validator        # against running validator
```

---

**Bottom line:** if `pnpm test && pnpm test:e2e && pnpm anchor:test` is green from a clean clone, the demo will not surprise you on stage.
