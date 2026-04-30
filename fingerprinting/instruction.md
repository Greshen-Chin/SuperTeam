# Fingerprinting Instructions

The fingerprinting goal: **detect the same video even after compression, re-encoding, or light edits.** Run in the browser by default (privacy + zero server cost). Server can re-run the same algorithm for fraud-check.

> Stack reference: TypeScript (strict, no React, no DOM in core) · Web Crypto API for SHA-256 · HTML5 `<video>` + `<canvas>` for frame extraction · `blockhash-js` for pHash · pure functions for matching.

---

## Table of Contents

1. [Responsibilities](#responsibilities)
2. [Setup](#setup)
3. [Folder Structure](#folder-structure)
4. [Algorithm](#algorithm)
5. [API Surface](#api-surface)
6. [Match Types & Confidence](#match-types--confidence)
7. [Performance Budget](#performance-budget)
8. [Demo Dataset](#demo-dataset)
9. [Stretch — Pose Fingerprint](#stretch--pose-fingerprint)
10. [Testing](#testing)
11. [Success Criteria](#success-criteria)

---

## Responsibilities

- Compute the canonical SHA-256 of the file.
- Sample `N` frames at a regular interval, generate a 64-bit perceptual hash per frame.
- Aggregate frame hashes into a `fingerprintRoot` (Merkle-style or simple SHA-256 over concatenation).
- Compare two fingerprints and return a numeric similarity score.
- Provide a Hamming distance helper used by the backend candidate search.

The fingerprinting package does **not**:

- Talk to the network.
- Talk to React, Next, or DOM directly **in its core functions** — those imports stay behind a thin `browser-adapter.ts`.
- Decide UX wording — it returns numbers, the frontend maps to copy.

---

## Setup

Standalone package layout (works as a workspace package or a folder consumed by the frontend).

```bash
cd fingerprinting
pnpm init -y
pnpm add blockhash-js
pnpm add -D typescript vitest @vitest/coverage-v8
```

`fingerprinting/package.json`:

```json
{
  "name": "@vidchain/fingerprinting",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./browser": "./src/browser-adapter.ts" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  }
}
```

Frontend imports:

```ts
import { sha256, computeFingerprint, compareFingerprints } from "@vidchain/fingerprinting";
import { extractFramesFromFile } from "@vidchain/fingerprinting/browser";
```

---

## Folder Structure

```text
fingerprinting/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                 # public API re-exports
│   ├── sha256.ts                # browser + node SHA-256
│   ├── phash.ts                 # blockhash-js wrapper, returns 64-bit hex
│   ├── frame-sampler.ts         # pure timing logic: which timestamps to sample
│   ├── browser-adapter.ts       # uses HTMLVideoElement + Canvas (browser only)
│   ├── matcher.ts               # hammingDistance, framesMatchedRatio, scoreToMatchType
│   ├── types.ts                 # Fingerprint, MatchType, MatchResult
│   └── constants.ts             # DEFAULT_FRAME_INTERVAL_MS, MAX_HAMMING, etc.
└── tests/
    ├── sha256.test.ts
    ├── phash.test.ts
    ├── matcher.test.ts
    └── fixtures/
        ├── tiny.mp4
        └── tiny-reencoded.mp4
```

---

## Algorithm

### 1. Sample frames

Sample one frame every **1.5 s**, capped at **60 frames** total. For very short videos (<10 s) sample every 0.5 s. This gives enough coverage to survive trims while keeping pHash work cheap.

```ts
// src/frame-sampler.ts
export function sampleTimestamps(durationSec: number): number[] {
  const intervalSec = durationSec < 10 ? 0.5 : 1.5;
  const count = Math.min(60, Math.max(4, Math.floor(durationSec / intervalSec)));
  return Array.from({ length: count }, (_, i) => (i + 0.5) * (durationSec / count));
}
```

### 2. Extract a frame as ImageData

In the browser, set `video.currentTime`, await `seeked`, draw to a 32×32 grayscale canvas. The 32×32 size matches `blockhash-js`'s preferred input.

```ts
// src/browser-adapter.ts
export async function extractFrameAt(video: HTMLVideoElement, t: number): Promise<ImageData> {
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error("seek failed"));
    video.currentTime = t;
  });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, 32, 32);
  return ctx.getImageData(0, 0, 32, 32);
}
```

### 3. pHash a frame

```ts
// src/phash.ts
import bmvbhash from "blockhash-js";

export function phashFromImageData(image: ImageData, bits: 8 | 16 = 8): string {
  // bmvbhash returns a hex string. bits=8 → 64-bit fingerprint (16 hex chars).
  return bmvbhash.bmvbhash(image, bits);
}
```

### 4. Aggregate

```ts
// src/index.ts
export async function computeFingerprint(file: File): Promise<Fingerprint> {
  const sha256Hex = await sha256(file);
  const { frameHashes, durationSec } = await extractFramesFromFile(file);
  const fingerprintRoot = await sha256OfString(frameHashes.join(""));
  return {
    sha256: sha256Hex,
    frameHashes,
    fingerprintRoot,
    duration: durationSec,
    version: "v1"
  };
}
```

### 5. Compare

```ts
// src/matcher.ts
export function hammingDistance(aHex: string, bHex: string): number {
  const a = BigInt("0x" + aHex);
  const b = BigInt("0x" + bHex);
  let diff = a ^ b, count = 0;
  while (diff) { count += Number(diff & 1n); diff >>= 1n; }
  return count;
}

export function framesMatchedRatio(a: string[], b: string[], maxDist = 10): number {
  // align shorter array against the longer; sliding window for trims
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let bestHits = 0;
  for (let offset = 0; offset <= longer.length - shorter.length; offset++) {
    let hits = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (hammingDistance(shorter[i], longer[i + offset]) <= maxDist) hits++;
    }
    bestHits = Math.max(bestHits, hits);
  }
  return bestHits / shorter.length;
}
```

---

## API Surface

```ts
// src/types.ts
export type Fingerprint = {
  sha256: string;             // 64 hex chars
  frameHashes: string[];      // each 16 hex chars (64 bits)
  fingerprintRoot: string;    // 64 hex chars
  duration: number;           // seconds
  version: "v1";
};

export type MatchType = "exact" | "visual" | "possible" | "none";

export type MatchResult = {
  matchType: MatchType;
  confidence: number;         // 0..1
  hammingDistance?: number;
  framesMatched?: number;
  framesTotal?: number;
};
```

```ts
// src/index.ts (public API)
export { sha256 } from "./sha256";
export { computeFingerprint } from "./compute-fingerprint";
export { hammingDistance, framesMatchedRatio, compareFingerprints, scoreToMatchType } from "./matcher";
export type { Fingerprint, MatchType, MatchResult } from "./types";
```

---

## Match Types & Confidence

| Match | Trigger | Confidence range | UI copy |
|---|---|---|---|
| `exact` | SHA-256 identical | `1.00` | "Exact Match Found" |
| `visual` | ≥ 60% frames within Hamming ≤ 10 | `0.85`–`0.99` | "Likely Match Found" |
| `possible` | ≥ 40% frames within Hamming ≤ 18 | `0.65`–`0.84` | "Possible Match" |
| `none` | none of the above | `< 0.65` | "No Registered Origin Found" |

Wording rule reminder: never say "stolen" or "infringed" — **legal language is out of scope** for the MVP.

---

## Performance Budget

| Step | Target on M1 Mac, 30 s 1080p video |
|---|---|
| SHA-256 | ≤ 200 ms |
| 20 frame samples (extract + pHash) | ≤ 2 s |
| `compareFingerprints` (one-vs-one) | ≤ 5 ms |
| End-to-end `computeFingerprint(file)` | ≤ 3 s |

If you exceed 5 s on a typical creator video, drop the frame count, parallelize via `Promise.all` on adapter side, or move heavy work to a Web Worker.

---

## Demo Dataset

`frontend/fixtures/demo/` (also referenced by Playwright e2e):

- `original.mp4` — 10–20 s clip, 1080p, ~5 MB. Source of truth for the demo.
- `original-reencoded.mp4` — same content, recompressed. Use HandBrake preset "Fast 720p30" with audio re-encoded. Different bytes, same visual.
- `original-trimmed.mp4` — first 3 s removed (tests sliding-window match).
- `unrelated.mp4` — completely different content, similar duration.

Generate with HandBrake CLI:

```bash
# original-reencoded.mp4
HandBrakeCLI -i original.mp4 -o original-reencoded.mp4 \
  --preset "Fast 720p30" -B 96

# original-trimmed.mp4
ffmpeg -ss 3 -i original.mp4 -c copy original-trimmed.mp4
```

Commit these fixtures to git (small, OK to track).

---

## Stretch — Pose Fingerprint

Only attempt after the MVP demo is rock-solid. Pose detection is powerful for dance videos but eats time.

1. Use `@tensorflow-models/pose-detection` with the `MoveNet` Lightning model (small, fast).
2. Per sampled frame, extract 17 keypoints `(x, y, score)` → flatten to a 34-float vector.
3. Compare two videos with **Dynamic Time Warping** to allow speed differences.
4. Fuse pose distance with pHash distance via a weighted average.

Add this only as `@vidchain/fingerprinting/pose` so it does not bloat the default bundle.

---

## Testing

See **[TESTING.md](../TESTING.md)** for the unified guide. Fingerprinting specifics:

- **Unit (Vitest):** pure functions only — `sha256`, `hammingDistance`, `framesMatchedRatio`, `scoreToMatchType`. Use `Buffer`-based fixtures (no DOM).
- **Integration (Vitest + jsdom):** `extractFrameAt` against a `<video>` mock — limited fidelity but catches regressions.
- **End-to-end (Playwright):** uploads `fixtures/demo/*.mp4` and asserts the on-screen `MatchType`. Lives in `frontend/tests/e2e/`.

Required specs before submission:

```text
sha256.test.ts             — same buffer twice → same hex; one-byte change → different hex
matcher.test.ts            — identical hashes → distance 0; flipped 8 bits → distance 8
matcher.test.ts            — original vs trimmed (sliding) → ratio ≥ 0.6
phash.test.ts              — identical ImageData → identical hex
e2e/verify-flow.spec.ts    — upload original-reencoded → "Likely Match Found"
e2e/verify-flow.spec.ts    — upload unrelated         → "No Registered Origin Found"
```

---

## Success Criteria

- [ ] `computeFingerprint(file)` returns deterministic output for identical input across reloads.
- [ ] Exact same file → `exact` match, confidence 1.00.
- [ ] HandBrake-recompressed copy → `visual` match, confidence ≥ 0.85.
- [ ] First-3-seconds-trimmed copy → `visual` or `possible` match, confidence ≥ 0.65.
- [ ] Unrelated video → `none`, confidence < 0.65.
- [ ] All public functions are typed (no `any` on the boundary).
- [ ] Vitest unit suite green.
- [ ] End-to-end performance under budget on demo machine.
