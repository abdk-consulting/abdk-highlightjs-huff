# highlightjs-huff

[![npm version](https://img.shields.io/npm/v/highlightjs-huff.svg)](https://www.npmjs.com/package/highlightjs-huff)
[![CI](https://github.com/abdk-consulting/highlightjs-huff/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/abdk-consulting/highlightjs-huff/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Highlight.js](https://highlightjs.org/) language plugin that adds rich
syntax highlighting for **[Huff](https://huff.sh/)** — the low-level EVM
assembly language for writing highly optimised Ethereum smart contracts.

---

## Features

- All `#define` variants highlighted: `macro`, `fn`, `test`, `function`,
  `event`, `error`, `constant`, `jumptable`, `jumptable__packed`, `table`
- Definition names highlighted as `title.function`
- `takes` / `returns` stack-annotation keywords
- Function modifiers: `view`, `pure`, `payable`, `nonpayable`, `indexed`
- `FREE_STORAGE_POINTER` keyword
- Complete EVM opcode set (including Cancun: `tload`, `tstore`, `mcopy`,
  `blobhash`, `blobbasefee`)
- Compiler built-in functions: `__FUNC_SIG`, `__EVENT_HASH`, `__ERROR`,
  `__RIGHTPAD`, `__codesize`, `__tablestart`, `__tablesize`
- Constant references `[NAME]` highlighted as `variable`
- Macro argument invocations `<name>` highlighted as `variable`
- Label definitions (`label:`) highlighted as `symbol`
- Test decorators (`#[calldata(...), value(...)]`)
- `#include` paths highlighted as strings
- Decimal and hexadecimal numeric literals
- Line and block comments
- Reliable auto-detection via `highlightAuto`

---

## Installation

```bash
npm install highlightjs-huff
```

> `highlight.js` ≥ 11 is a peer dependency — install it separately if you
> haven't already:
>
> ```bash
> npm install highlight.js
> ```

---

## Usage

### CommonJS / Node.js

```js
const hljs = require("highlight.js");
const huff = require("highlightjs-huff");

hljs.registerLanguage("huff", huff.default ?? huff);

const code = `
#define macro MAIN() = takes (0) returns (0) {
    0x00 calldataload
    0xE0 shr
    __FUNC_SIG(transfer) eq transfer jumpi
    0x00 0x00 revert
    transfer:
        0x01 0x00 mstore
        0x20 0x00 return
}
`.trim();

const html = hljs.highlight(code, { language: "huff" }).value;
console.log(html);
```

### ES Modules

```js
import hljs from "highlight.js";
import huff from "highlightjs-huff";

hljs.registerLanguage("huff", huff);

const result = hljs.highlight(code, { language: "huff" });
```

### Browser (CDN)

Load Highlight.js first, then load this plugin:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js"></script>
<!-- highlightjs-huff -->
<script src="https://unpkg.com/highlightjs-huff/dist/index.js"></script>
<script>
  hljs.registerLanguage("huff", window.hljsHuff?.default ?? window.hljsHuff);
  hljs.highlightAll();
</script>
```

Then mark up your code blocks:

```html
<pre><code class="language-huff">
#define macro MAIN() = takes (0) returns (0) {
    0x00 calldataload 0xE0 shr
    __FUNC_SIG(transfer) eq transfer jumpi
    0x00 0x00 revert
    transfer:
        0x04 calldataload
        0x24 calldataload
        TRANSFER()
        0x20 0x00 return
}
</code></pre>
```

### Auto-detection

The plugin registers Huff with high relevance scores on `#define` directives
and built-in functions so `highlightAuto` correctly identifies Huff source
files:

```js
const result = hljs.highlightAuto(unknownCode);
console.log(result.language); // "huff"
```

---

## Supported syntax elements

| Element | Highlight class |
|---------|----------------|
| `#define`, `#include`, `#[…]` decorator | `hljs-meta` |
| Definition types (`macro`, `fn`, `test`, …) | `hljs-keyword` |
| `takes`, `returns`, modifiers | `hljs-keyword` |
| `FREE_STORAGE_POINTER` | `hljs-keyword` |
| Definition names | `hljs-title function_` |
| EVM opcodes | `hljs-built_in` |
| Compiler built-ins (`__FUNC_SIG`, …) | `hljs-built_in` |
| Constant references `[NAME]` | `hljs-variable` |
| Macro argument invocations `<name>` | `hljs-variable` |
| Label definitions (`label:`) | `hljs-symbol` |
| Numeric literals | `hljs-number` |
| String literals | `hljs-string` |
| Comments | `hljs-comment` |

---

## Example

```huff
#include "huffmate/auth/Owned.huff"

#define function transfer(address, uint256) nonpayable returns (bool)
#define event Transfer(address indexed, address indexed, uint256)
#define error InsufficientBalance(uint256, uint256)

#define constant BALANCE_SLOT = FREE_STORAGE_POINTER()

#define macro TRANSFER() = takes (2) returns (0) {
    // Input stack: [to, amount]
    caller                    // [from, to, amount]
    dup3                      // [amount, from, to, amount]
    [BALANCE_SLOT] sload      // [balance, amount, from, to, amount]
    dup2 dup2 lt              // [balance < amount, balance, amount, from, to, amount]
    insufficient jumpi        // [balance, amount, from, to, amount]

    sub                       // [new_balance, from, to, amount]
    caller [BALANCE_SLOT] sstore   // [from, to, amount]

    // emit Transfer(from, to, amount)
    __EVENT_HASH(Transfer)
    0x00 0x00 log3

    stop

    insufficient:
        __ERROR(InsufficientBalance)
        0x00 mstore
        0x24 0x00 revert
}
```

---

## License

[MIT](LICENSE) © ABDK Consulting
