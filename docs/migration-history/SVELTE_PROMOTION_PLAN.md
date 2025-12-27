# Svelte Promotion Plan

Promote the Svelte app from `svelte-app/` to the project root.

**Approach:** Delete vanilla JS files first, then move Svelte contents up one level.

---

## Phase 1: Git Setup (Preserve v1.x)

### 1.1 Ensure clean working state
```bash
git checkout main
```

### 1.2 Tag and branch
```bash
git tag -a v1.0.0 -m "Final vanilla JS version before Svelte migration"
git branch 1.x
```

---

## Phase 2: Delete Vanilla JS Files

### 2.1 Files to DELETE

| Path | Description |
|------|-------------|
| `js/` | All vanilla JS modules |
| `style.css` | Vanilla CSS |
| `config.js` | Vanilla config |
| `index.html` | Vanilla entry point |
| `package.json` | Vanilla deps |
| `package-lock.json` | Will regenerate |
| `node_modules/` | Will reinstall |
| `playwright.config.js` | Vanilla Playwright config |
| `tests/*.test.js` | Vanilla unit tests |
| `tests/mocks/` | Vanilla mocks |
| `tests/e2e/` | Vanilla E2E tests |

### 2.2 Files to KEEP

| Path | Reason |
|------|--------|
| `.git/` | Git history |
| `.github/` | CI workflows (will update) |
| `.claude/` | Claude Code commands |
| `docs/` | Documentation |
| `plans/` | Migration history |
| `tests/data/` | Test fixtures (reusable) |
| `CLAUDE.md` | Will update |
| `README.md` | Will update |

### 2.3 Delete commands
```bash
rm -rf js/
rm -rf node_modules/
rm style.css config.js index.html package.json package-lock.json
rm playwright.config.js
rm tests/*.test.js
rm -rf tests/mocks/
rm -rf tests/e2e/
```

After deletion, only `tests/data/` remains in tests directory.

---

## Phase 3: Move Svelte App Up One Level

### 3.1 Move all svelte-app contents to root
```bash
mv svelte-app/* ./
mv svelte-app/.gitignore ./
mv svelte-app/.vscode ./ 2>/dev/null || true
mv svelte-app/.tool-versions ./ 2>/dev/null || true
rmdir svelte-app
```

### 3.2 Resulting structure
```
/
├── src/                    # Svelte source
├── tests/                  # From svelte-app/tests/ + kept data/
│   ├── data/              # Test fixtures (kept)
│   ├── e2e/               # Svelte E2E tests
│   └── *.svelte.test.ts   # Svelte unit tests
├── public/                 # Static assets
├── .github/               # CI (needs update)
├── .claude/               # Claude Code commands
├── docs/                  # Documentation
├── plans/                 # Migration history
├── index.html             # Svelte entry point
├── package.json           # Svelte deps
├── vite.config.ts
├── svelte.config.js
├── tsconfig*.json
├── playwright.config.ts
├── CLAUDE.md
└── README.md
```

---

## Phase 4: Update GitHub Actions

Update `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run check
      - run: npm run test:run
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Phase 5: Update Documentation

### 5.1 CLAUDE.md
- Remove vanilla JS sections
- Update file structure (src/ at root, no js/)
- Remove "Migration in Progress" language
- Update commands (no more `cd svelte-app`)

### 5.2 README.md
- Simplify to just Svelte setup
- `npm install && npm run dev`
- Note Node 22+ requirement

### 5.3 Archive plans/
```bash
mkdir -p docs/migration-history
mv plans/* docs/migration-history/
rmdir plans
```

---

## Phase 6: Install and Verify

```bash
npm install
npm run check
npm run test:run
npm run build
npm run test:e2e
```

### Manual checklist
- [ ] `npm run dev` starts at localhost:5173
- [ ] Open folder works
- [ ] File tree, tabs, search work
- [ ] Daily notes work
- [ ] Save/edit files work

---

## Phase 7: Commit and Tag

```bash
git add -A
git commit -m "Promote Svelte app to root, remove vanilla JS

- Delete vanilla JS (js/, style.css, config.js, old tests)
- Move svelte-app/ to project root
- Update CI workflow and documentation

BREAKING CHANGE: Requires Node 22+, npm build step.

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git tag -a v2.0.0 -m "Svelte 5 rewrite"
```

---

## Quick Command Sequence

```bash
# Phase 1
git checkout main
git tag -a v1.0.0 -m "Final vanilla JS version"
git branch 1.x

# Phase 2
rm -rf js/ node_modules/
rm style.css config.js index.html package.json package-lock.json playwright.config.js
rm tests/*.test.js
rm -rf tests/mocks/ tests/e2e/

# Phase 3
mv svelte-app/* ./
mv svelte-app/.* ./ 2>/dev/null || true
rmdir svelte-app

# Phase 4-5: Update .github/workflows/test.yml, CLAUDE.md, README.md

# Phase 6
npm install
npm run check && npm run test:run && npm run build && npm run test:e2e

# Phase 7
git add -A && git commit -m "..." && git tag -a v2.0.0 -m "..."
```

---

## Rollback

```bash
git checkout v1.0.0   # or git checkout 1.x
```
