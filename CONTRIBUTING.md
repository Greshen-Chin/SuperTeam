# Contributing to VidChain

Short hackathon, high stakes. Contributions follow strict but simple rules so the demo on day 3 is not surprising.

---

## Branches

| Branch | Purpose | Protection |
|---|---|---|
| `main` | Always green, always deployable | PR + CI required |
| `feat/<topic>` | New feature | none |
| `fix/<topic>` | Bug fix | none |
| `chore/<topic>` | Tooling / docs / deps | none |

> Never push directly to `main`. Even a one-line readme change goes through a PR so CI runs.

---

## Commits — Conventional Commits

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

- **type**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
- **scope**: workstream — `frontend`, `backend`, `blockchain`, `bot`, `fingerprinting`, `shared` — or `repo` for cross-cutting.
- **subject**: imperative, lowercase, ≤ 60 chars, no trailing period.
- **breaking change**: append `!` after type/scope and add `BREAKING CHANGE:` footer.

Examples:

```
feat(frontend): add verify page with confidence meter
fix(blockchain): correct PDA seed for proof account
chore(repo): add pnpm-workspace.yaml
test(fingerprinting): cover trimmed-video sliding match
feat(shared)!: rename frameHashes → frameFingerprints
```

---

## Pull Requests

### Title
- Match the merge-commit style: `feat(scope): subject`.

### Description template
```markdown
## What
One-paragraph summary of the user-visible change.

## Why
What problem this solves. Link the relevant section of `instruction.md` if applicable.

## How
Notable implementation choices or trade-offs.

## Screenshots / GIFs
Required for any UI change.

## Test plan
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass
- [ ] Playwright spec added/updated
- [ ] Manually verified on Vercel preview URL: <link>
```

### Required CI checks (must be green to merge)
- `lint`
- `typecheck`
- `test` (Vitest unit + integration)
- `e2e` (Playwright)
- `anchor-build` (only if `blockchain/**` touched)

### Reviewer expectations
- One approving review.
- Reviewer reads diff *and* opens the Vercel preview before approving.
- For changes to `shared/`, the reviewer is the workstream lead of every consumer (frontend, backend, bot).

---

## Code Style

- TypeScript **strict** mode everywhere.
- ESLint is the source of truth. `pnpm lint --fix` before pushing.
- Prettier formats on save (configure your IDE; default config, no `.prettierrc` needed).
- Filenames: `kebab-case.ts`. Components: `PascalCase.tsx`. Hooks: `use-camel-case.ts`.
- No `any` without an inline ESLint disable + reason.
- No `console.log` left behind. Use `pino` server-side; remove client-side debug logs before merging.
- `data-testid` for any element a Playwright spec might select. Never test against text or class.

Layered import order (enforce via `eslint-plugin-import`):
1. external
2. `@vidchain/*` (workspace packages)
3. `@/server/*` or `@/lib/*`
4. `@/components/*`, `@/features/*`
5. relative

---

## File Hygiene

- Update `.env.example` whenever a new env key is added.
- Delete dead code — no `// TODO: remove later` flags.
- One PR = one concern. Split mechanical refactors from behavior changes.
- Generated artifacts that other workstreams need (e.g. Anchor IDL/types) **are committed** under `blockchain/clients/ts/idl/` so consumers can build without the Rust toolchain.
- Generated build outputs (`.next`, `dist`, `target`) **are not committed** — see `.gitignore`.

---

## Local Pre-Commit Checks

Optional but recommended — install [`husky`](https://typicode.github.io/husky):

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

`.husky/pre-commit`:
```sh
pnpm exec lint-staged
```

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

---

## Security

- **Never** commit `.env.local`, `*.production.env`, deployer keypairs (`*.json`), or service-role keys.
- Run `git diff --cached` before every commit; if you see `BEGIN PRIVATE KEY`, `eyJ...` JWT tokens, or `[A-Za-z0-9]{40,}` patterns that look like secrets, **stop**.
- If a secret leaks: rotate immediately (Supabase reset key, NFT.Storage revoke, Solana keypair retire), then `git filter-repo` to remove from history, force-push to a new branch, and notify the team.
- Report security issues privately to the team lead — do not open a public issue.

---

## When You're Stuck

- Re-read the relevant `instruction.md`.
- Ping the workstream owner in Slack/Discord with: file path + line + what you tried + the error message.
- Open a draft PR early — easier to course-correct against real code than against a description.

Welcome to the team. Ship it.
