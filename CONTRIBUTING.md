# Developer Guide — abdk-highlightjs-huff

A [Highlight.js](https://highlightjs.org/) language plugin that adds syntax
highlighting for [Huff](https://huff.sh/) — the low-level EVM assembly language
for writing highly optimised Ethereum smart contracts.

---

## Repository layout

```
abdk-highlightjs-huff/
├── src/
│   ├── index.ts            ← language definition (single source file)
│   └── test/
│       └── index.test.ts   ← test suite (Node.js built-in test runner)
├── dist/                   ← compiled output (git-ignored, npm-published)
│   ├── index.js
│   ├── index.d.ts
│   └── *.map
├── .github/
│   └── workflows/
│       └── ci.yml          ← GitHub Actions CI (build + test on every push/PR)
├── .gitignore
├── .npmignore              ← controls what's excluded from the npm tarball
├── package.json
├── tsconfig.json
├── LICENSE                 ← MIT
├── CONTRIBUTING.md         ← this file (developer docs)
└── README.md               ← public docs shown on npmjs.com
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18 LTS |
| npm | 9 |

Install dependencies:

```bash
npm install
```

---

## Building

```bash
npm run build          # compile TypeScript → dist/
npm run build:watch    # watch mode
npm run clean          # remove dist/
```

The TypeScript compiler is configured via `tsconfig.json`:

- **`rootDir`** — `src/`
- **`outDir`** — `dist/`
- **`declaration`** — `true` → `.d.ts` files are emitted
- **`declarationMap`** — `true` → source-map for `.d.ts` files
- **`sourceMap`** — `true` → `.js.map` files for debugging

---

## Testing

```bash
npm test
```

This first compiles the project and then runs the tests with the Node.js
built-in test runner (`node:test`) — no extra test-framework dependency.

The test suite lives in `src/test/index.test.ts` and covers:

| Area | What is tested |
|------|---------------|
| `#define` directives | `macro`, `fn`, `test`, `function`, `event`, `error`, `constant`, `jumptable`, `jumptable__packed`, `table` |
| `#include` directive | `include` meta span, string path |
| `#[…]` decorators | `calldata`, `value` test decorators |
| Comments | `// …` line comments, `/* … */` block comments |
| Keywords | `takes`, `returns`, modifiers (`view`, `pure`, `payable`, `nonpayable`, `indexed`) |
| Built-ins | EVM opcodes, compiler built-ins (`__FUNC_SIG`, `__EVENT_HASH`, `__ERROR`, `__RIGHTPAD`, `__codesize`, `__tablestart`, `__tablesize`) |
| `FREE_STORAGE_POINTER` | Keyword highlight |
| Constant references | `[NAME]` highlighted as variable |
| Macro argument invocations | `<name>` highlighted as variable |
| Label definitions | `label:` highlighted as symbol |
| Numeric literals | Decimal, `0x…` hex |
| Definition names | `title.function` class |
| Full macro snippet | End-to-end highlight of a `MAIN` macro |
| Auto-detection (positive) | Huff snippets correctly identified by `highlightAuto` |
| Auto-detection (negative) | JS, Solidity, C, Rust, Python, TypeScript not misidentified |

---

## Linting / type checking

```bash
npm run lint    # runs tsc --noEmit to catch type errors without emitting files
```

---

## Publishing to npm

> Only project maintainers with npm publish rights should perform this step.

1. Bump the `version` field in `package.json` following [SemVer](https://semver.org/).
2. Run `npm publish --dry-run` to verify the tarball contents.
3. Run `npm publish` (requires `npm login` first).

The `prepublishOnly` hook runs `build` + `test` automatically before any
publish, so you cannot accidentally publish broken code.

The published tarball (controlled by the `files` field in `package.json`)
contains only:

```
dist/        ← compiled JS + .d.ts + source maps
LICENSE
README.md
```

TypeScript source files are **not** included in the published package.

---

## Language definition overview (`src/index.ts`)

The file exports a single default function `huff(hljs)` which returns a
Highlight.js `Language` object.  The rules are processed **top-to-bottom**;
earlier rules take priority:

| Rule | CSS class | Notes |
|------|-----------|-------|
| `DECORATOR` | `hljs-meta` | Handles `#[calldata(…), value(…)]` test decorators |
| `DEFINE` | `hljs-meta` + inner `hljs-keyword` / `hljs-title.function` | Handles all `#define <type> <name>` variants |
| `INCLUDE` | `hljs-meta` + inner `hljs-string` | Handles `#include "…";` |
| `CONSTANT_REF` | `hljs-variable` | `[NAME]` constant references |
| `MACRO_ARG` | `hljs-variable` | `<name>` macro argument invocations |
| `LABEL` | `hljs-symbol` | `label:` definitions |
| `C_LINE_COMMENT_MODE` | `hljs-comment` | `// …` |
| `C_BLOCK_COMMENT_MODE` | `hljs-comment` | `/* … */` |
| `QUOTE_STRING_MODE` | `hljs-string` | `"…"` |
| `C_NUMBER_MODE` | `hljs-number` | Decimal + hex |
| `keywords` | `hljs-keyword` / `hljs-built_in` | Keyword bag (opcodes, built-ins, modifiers) |

---

## Contribution workflow

1. Fork the repository and create a feature branch.
2. Make your changes in `src/`.
3. Add or update tests in `src/test/index.test.ts`.
4. Run `npm test` — all tests must pass.
5. Open a Pull Request.  CI will run automatically.
