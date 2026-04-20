/**
 * Comprehensive test suite for highlightjs-huff.
 *
 * Uses Node.js built-in test runner (node:test) and assert — no extra
 * dependencies needed beyond highlight.js itself.
 *
 * Run:  npm test
 */

import hljs from "highlight.js";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import huff from "../index.js";

// Register the language once for all tests.
hljs.registerLanguage("huff", huff);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decode the five standard HTML entities so that assertions can be written
 * against the original source characters instead of their escaped forms.
 */
function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Highlight `code` with the given `language` and return the decoded HTML.
 */
function highlight(code: string, language: string): string {
  return decodeEntities(hljs.highlight(code, { language }).value);
}

/**
 * Auto-detect the language for `code` and return the detected language name.
 */
function detect(code: string): string {
  const result = hljs.highlightAuto(code);
  return result.language ?? "";
}

/**
 * Assert that `html` contains a span with the given CSS class that either:
 *  (a) directly wraps `text` as its ONLY content, OR
 *  (b) begins with the class and contains `text` as literal (unspanned) text
 *      directly inside it (the DEFINE case where hljs wraps the entire
 *      directive in one outer meta-span).
 */
function assertSpan(html: string, cls: string, text: string): void {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Case (a): span wraps text directly — no child spans around it
  const directRe = new RegExp(`<span class="${cls}"[^>]*>${escaped}<\\/span>`);
  // Case (b): outer span contains text as raw (untagged) content somewhere inside
  const outerRe = new RegExp(
    `<span class="${cls}"[^>]*>[^<]*(?:<span[^>]*>[^<]*<\\/span>[^<]*)*${escaped}`
  );
  assert.ok(
    directRe.test(html) || outerRe.test(html),
    `Expected span.${cls} containing "${text}"\nActual HTML:\n${html}`
  );
}

// ---------------------------------------------------------------------------
// 1. Comments
// ---------------------------------------------------------------------------

describe("comments", () => {
  it("highlights single-line comment", () => {
    const html = highlight("// this is a comment", "huff");
    assertSpan(html, "hljs-comment", "// this is a comment");
  });

  it("highlights block comment", () => {
    const html = highlight("/* block */", "huff");
    assertSpan(html, "hljs-comment", "/* block */");
  });

  it("highlights multi-line block comment", () => {
    const html = highlight("/* line1\n   line2 */", "huff");
    assert.match(html, /class="hljs-comment"/, "Block comment should be highlighted");
  });
});

// ---------------------------------------------------------------------------
// 2. #include directive
// ---------------------------------------------------------------------------

describe("#include directive", () => {
  it("highlights #include as meta", () => {
    const html = highlight('#include "huffmate/utils/Errors.huff"', "huff");
    assertSpan(html, "hljs-meta", "#include");
  });

  it("highlights the included path as a string", () => {
    const html = highlight('#include "huffmate/utils/Errors.huff"', "huff");
    assertSpan(html, "hljs-string", '"huffmate/utils/Errors.huff"');
  });
});

// ---------------------------------------------------------------------------
// 3. Test decorator
// ---------------------------------------------------------------------------

describe("test decorator #[...]", () => {
  it("highlights decorator as meta", () => {
    const html = highlight('#[calldata("0x01"), value(0x01)]', "huff");
    assert.match(html, /class="hljs-meta"/, "Decorator should be highlighted as meta");
  });

  it("highlights string argument inside decorator", () => {
    const html = highlight('#[calldata("0x0000000000000000")]', "huff");
    assertSpan(html, "hljs-string", '"0x0000000000000000"');
  });
});

// ---------------------------------------------------------------------------
// 4. #define macro / fn / test  (definition type + name)
// ---------------------------------------------------------------------------

describe("#define macro", () => {
  it("highlights #define as meta", () => {
    const html = highlight("#define macro MAIN() = takes (0) returns (0) {}", "huff");
    assertSpan(html, "hljs-meta", "#define");
  });

  it("highlights `macro` as keyword", () => {
    const html = highlight("#define macro MAIN() = takes (0) returns (0) {}", "huff");
    assertSpan(html, "hljs-keyword", "macro");
  });

  it("highlights macro name as title.function", () => {
    const html = highlight("#define macro MAIN() = takes (0) returns (0) {}", "huff");
    assertSpan(html, "hljs-title function_", "MAIN");
  });

  it("highlights `takes` as keyword", () => {
    const html = highlight("#define macro MAIN() = takes (0) returns (0) {}", "huff");
    assertSpan(html, "hljs-keyword", "takes");
  });

  it("highlights `returns` as keyword", () => {
    const html = highlight("#define macro MAIN() = takes (0) returns (0) {}", "huff");
    assertSpan(html, "hljs-keyword", "returns");
  });
});

describe("#define fn", () => {
  it("highlights `fn` as keyword", () => {
    const html = highlight("#define fn MUL_DIV_DOWN(err) = takes (3) returns (1) {}", "huff");
    assertSpan(html, "hljs-keyword", "fn");
  });

  it("highlights fn name as title.function", () => {
    const html = highlight("#define fn MUL_DIV_DOWN(err) = takes (3) returns (1) {}", "huff");
    assertSpan(html, "hljs-title function_", "MUL_DIV_DOWN");
  });
});

describe("#define test", () => {
  it("highlights `test` as keyword", () => {
    const html = highlight("#define test MY_TEST() = {}", "huff");
    assertSpan(html, "hljs-keyword", "test");
  });

  it("highlights test name as title.function", () => {
    const html = highlight("#define test MY_TEST() = {}", "huff");
    assertSpan(html, "hljs-title function_", "MY_TEST");
  });
});

// ---------------------------------------------------------------------------
// 5. #define function / event / error
// ---------------------------------------------------------------------------

describe("#define function", () => {
  it("highlights `function` keyword", () => {
    const html = highlight(
      "#define function addWord(uint256) pure returns (uint256)",
      "huff"
    );
    assertSpan(html, "hljs-keyword", "function");
  });

  it("highlights function interface name as title.function", () => {
    const html = highlight(
      "#define function addWord(uint256) pure returns (uint256)",
      "huff"
    );
    assertSpan(html, "hljs-title function_", "addWord");
  });

  it("highlights `pure` modifier as keyword", () => {
    const html = highlight(
      "#define function addWord(uint256) pure returns (uint256)",
      "huff"
    );
    assertSpan(html, "hljs-keyword", "pure");
  });

  it("highlights `view` modifier as keyword", () => {
    const html = highlight(
      "#define function balanceOf(address) view returns (uint256)",
      "huff"
    );
    assertSpan(html, "hljs-keyword", "view");
  });

  it("highlights `payable` modifier as keyword", () => {
    const html = highlight(
      "#define function deposit() payable returns ()",
      "huff"
    );
    assertSpan(html, "hljs-keyword", "payable");
  });

  it("highlights `nonpayable` modifier as keyword", () => {
    const html = highlight(
      "#define function transfer(address, uint256) nonpayable returns (bool)",
      "huff"
    );
    assertSpan(html, "hljs-keyword", "nonpayable");
  });
});

describe("#define event", () => {
  it("highlights `event` keyword", () => {
    const html = highlight("#define event Transfer(address indexed, uint256)", "huff");
    assertSpan(html, "hljs-keyword", "event");
  });

  it("highlights event name as title.function", () => {
    const html = highlight("#define event Transfer(address indexed, uint256)", "huff");
    assertSpan(html, "hljs-title function_", "Transfer");
  });

  it("highlights `indexed` keyword", () => {
    const html = highlight("#define event Transfer(address indexed, uint256)", "huff");
    assertSpan(html, "hljs-keyword", "indexed");
  });
});

describe("#define error", () => {
  it("highlights `error` keyword", () => {
    const html = highlight("#define error PanicError(uint256)", "huff");
    assertSpan(html, "hljs-keyword", "error");
  });

  it("highlights error name as title.function", () => {
    const html = highlight("#define error PanicError(uint256)", "huff");
    assertSpan(html, "hljs-title function_", "PanicError");
  });
});

// ---------------------------------------------------------------------------
// 6. #define constant
// ---------------------------------------------------------------------------

describe("#define constant", () => {
  it("highlights `constant` keyword", () => {
    const html = highlight("#define constant NUM = 0x420", "huff");
    assertSpan(html, "hljs-keyword", "constant");
  });

  it("highlights constant name as title.function", () => {
    const html = highlight("#define constant NUM = 0x420", "huff");
    assertSpan(html, "hljs-title function_", "NUM");
  });

  it("highlights hex constant value as number", () => {
    const html = highlight("#define constant NUM = 0x420", "huff");
    assertSpan(html, "hljs-number", "0x420");
  });

  it("highlights FREE_STORAGE_POINTER as keyword", () => {
    const html = highlight("#define constant OWNER = FREE_STORAGE_POINTER()", "huff");
    assertSpan(html, "hljs-keyword", "FREE_STORAGE_POINTER");
  });
});

// ---------------------------------------------------------------------------
// 7. #define jumptable / jumptable__packed / table
// ---------------------------------------------------------------------------

describe("#define jumptable", () => {
  it("highlights `jumptable` keyword", () => {
    const html = highlight("#define jumptable SWITCH_TABLE { jump_one jump_two }", "huff");
    assertSpan(html, "hljs-keyword", "jumptable");
  });

  it("highlights jump table name as title.function", () => {
    const html = highlight("#define jumptable SWITCH_TABLE { jump_one jump_two }", "huff");
    assertSpan(html, "hljs-title function_", "SWITCH_TABLE");
  });

  it("highlights `jumptable__packed` keyword", () => {
    const html = highlight(
      "#define jumptable__packed PACKED_TABLE { lbl_a lbl_b }",
      "huff"
    );
    assertSpan(html, "hljs-keyword", "jumptable__packed");
  });
});

describe("#define table", () => {
  it("highlights `table` keyword", () => {
    const html = highlight("#define table CODE_TABLE { 0x604260005260206000F3 }", "huff");
    assertSpan(html, "hljs-keyword", "table");
  });

  it("highlights code table name as title.function", () => {
    const html = highlight("#define table CODE_TABLE { 0x604260005260206000F3 }", "huff");
    assertSpan(html, "hljs-title function_", "CODE_TABLE");
  });
});

// ---------------------------------------------------------------------------
// 8. EVM opcodes
// ---------------------------------------------------------------------------

describe("EVM opcodes", () => {
  // Arithmetic
  const arithmeticOps = ["add", "mul", "sub", "div", "mod", "exp", "addmod", "mulmod"];
  for (const op of arithmeticOps) {
    it(`highlights arithmetic opcode \`${op}\``, () => {
      const html = highlight(op, "huff");
      assertSpan(html, "hljs-built_in", op);
    });
  }

  // Comparison / bitwise
  const cmpOps = ["lt", "gt", "eq", "iszero", "and", "or", "xor", "not", "shl", "shr", "sar"];
  for (const op of cmpOps) {
    it(`highlights comparison/bitwise opcode \`${op}\``, () => {
      const html = highlight(op, "huff");
      assertSpan(html, "hljs-built_in", op);
    });
  }

  // Environmental
  const envOps = ["caller", "callvalue", "calldataload", "calldatasize", "codesize", "gas"];
  for (const op of envOps) {
    it(`highlights environmental opcode \`${op}\``, () => {
      const html = highlight(op, "huff");
      assertSpan(html, "hljs-built_in", op);
    });
  }

  // Block
  const blockOps = ["timestamp", "number", "chainid", "selfbalance", "basefee"];
  for (const op of blockOps) {
    it(`highlights block opcode \`${op}\``, () => {
      const html = highlight(op, "huff");
      assertSpan(html, "hljs-built_in", op);
    });
  }

  // Stack / memory / storage
  const stackOps = ["pop", "mload", "mstore", "mstore8", "sload", "sstore"];
  for (const op of stackOps) {
    it(`highlights stack/memory/storage opcode \`${op}\``, () => {
      const html = highlight(op, "huff");
      assertSpan(html, "hljs-built_in", op);
    });
  }

  // Control flow
  it("highlights `jump`", () => assertSpan(highlight("jump", "huff"), "hljs-built_in", "jump"));
  it("highlights `jumpi`", () => assertSpan(highlight("jumpi", "huff"), "hljs-built_in", "jumpi"));
  it("highlights `jumpdest`", () => assertSpan(highlight("jumpdest", "huff"), "hljs-built_in", "jumpdest"));
  it("highlights `stop`", () => assertSpan(highlight("stop", "huff"), "hljs-built_in", "stop"));
  it("highlights `return`", () => assertSpan(highlight("return", "huff"), "hljs-built_in", "return"));
  it("highlights `revert`", () => assertSpan(highlight("revert", "huff"), "hljs-built_in", "revert"));
  it("highlights `selfdestruct`", () => assertSpan(highlight("selfdestruct", "huff"), "hljs-built_in", "selfdestruct"));
  it("highlights `invalid`", () => assertSpan(highlight("invalid", "huff"), "hljs-built_in", "invalid"));

  // Push
  it("highlights `push0`", () => assertSpan(highlight("push0", "huff"), "hljs-built_in", "push0"));
  it("highlights `push1`", () => assertSpan(highlight("push1", "huff"), "hljs-built_in", "push1"));
  it("highlights `push32`", () => assertSpan(highlight("push32", "huff"), "hljs-built_in", "push32"));

  // Dup / Swap
  it("highlights `dup1`", () => assertSpan(highlight("dup1", "huff"), "hljs-built_in", "dup1"));
  it("highlights `dup16`", () => assertSpan(highlight("dup16", "huff"), "hljs-built_in", "dup16"));
  it("highlights `swap1`", () => assertSpan(highlight("swap1", "huff"), "hljs-built_in", "swap1"));
  it("highlights `swap16`", () => assertSpan(highlight("swap16", "huff"), "hljs-built_in", "swap16"));

  // Log
  it("highlights `log0`", () => assertSpan(highlight("log0", "huff"), "hljs-built_in", "log0"));
  it("highlights `log4`", () => assertSpan(highlight("log4", "huff"), "hljs-built_in", "log4"));

  // System calls
  it("highlights `call`", () => assertSpan(highlight("call", "huff"), "hljs-built_in", "call"));
  it("highlights `staticcall`", () => assertSpan(highlight("staticcall", "huff"), "hljs-built_in", "staticcall"));
  it("highlights `delegatecall`", () => assertSpan(highlight("delegatecall", "huff"), "hljs-built_in", "delegatecall"));
  it("highlights `create`", () => assertSpan(highlight("create", "huff"), "hljs-built_in", "create"));
  it("highlights `create2`", () => assertSpan(highlight("create2", "huff"), "hljs-built_in", "create2"));

  // Cancun opcodes
  it("highlights `tload`", () => assertSpan(highlight("tload", "huff"), "hljs-built_in", "tload"));
  it("highlights `tstore`", () => assertSpan(highlight("tstore", "huff"), "hljs-built_in", "tstore"));
  it("highlights `mcopy`", () => assertSpan(highlight("mcopy", "huff"), "hljs-built_in", "mcopy"));
  it("highlights `blobhash`", () => assertSpan(highlight("blobhash", "huff"), "hljs-built_in", "blobhash"));
  it("highlights `blobbasefee`", () => assertSpan(highlight("blobbasefee", "huff"), "hljs-built_in", "blobbasefee"));
});

// ---------------------------------------------------------------------------
// 9. Compiler built-in functions
// ---------------------------------------------------------------------------

describe("compiler built-in functions", () => {
  const builtins = [
    "__FUNC_SIG",
    "__EVENT_HASH",
    "__ERROR",
    "__RIGHTPAD",
    "__codesize",
    "__tablestart",
    "__tablesize"
  ];

  for (const fn of builtins) {
    it(`highlights \`${fn}\` as built_in`, () => {
      const html = highlight(`${fn}(FOO)`, "huff");
      assertSpan(html, "hljs-built_in", fn);
    });
  }
});

// ---------------------------------------------------------------------------
// 10. Constant references [NAME]
// ---------------------------------------------------------------------------

describe("constant references [NAME]", () => {
  it("highlights [OWNER] as variable", () => {
    const html = highlight("[OWNER] sload", "huff");
    assertSpan(html, "hljs-variable", "[OWNER]");
  });

  it("highlights [NUM] as variable", () => {
    const html = highlight("0x00 [NUM] mstore", "huff");
    assertSpan(html, "hljs-variable", "[NUM]");
  });

  it("highlights lowercase constant reference", () => {
    const html = highlight("[_slot]", "huff");
    assertSpan(html, "hljs-variable", "[_slot]");
  });
});

// ---------------------------------------------------------------------------
// 11. Macro argument invocations <name>
// ---------------------------------------------------------------------------

describe("macro argument invocations <name>", () => {
  it("highlights <increment> as variable", () => {
    const html = highlight("<increment>", "huff");
    assertSpan(html, "hljs-variable", "<increment>");
  });

  it("highlights <err> label argument as variable", () => {
    const html = highlight("<err> jumpi", "huff");
    assertSpan(html, "hljs-variable", "<err>");
  });
});

// ---------------------------------------------------------------------------
// 12. Label definitions
// ---------------------------------------------------------------------------

describe("label definitions", () => {
  it("highlights a label definition as symbol", () => {
    const html = highlight("success:", "huff");
    assertSpan(html, "hljs-symbol", "success");
  });

  it("highlights `is_owner` label as symbol", () => {
    const html = highlight("is_owner:", "huff");
    assertSpan(html, "hljs-symbol", "is_owner");
  });

  it("highlights `err` label as symbol", () => {
    const html = highlight("err:", "huff");
    assertSpan(html, "hljs-symbol", "err");
  });
});

// ---------------------------------------------------------------------------
// 13. Numeric literals
// ---------------------------------------------------------------------------

describe("numeric literals", () => {
  it("highlights decimal integer", () => {
    const html = highlight("32", "huff");
    assertSpan(html, "hljs-number", "32");
  });

  it("highlights hex literal 0x00", () => {
    const html = highlight("0x00", "huff");
    assertSpan(html, "hljs-number", "0x00");
  });

  it("highlights long hex literal", () => {
    const html = highlight("0xdeadbeef", "huff");
    assertSpan(html, "hljs-number", "0xdeadbeef");
  });

  it("highlights hex literal 0x20", () => {
    const html = highlight("0x20 mstore", "huff");
    assertSpan(html, "hljs-number", "0x20");
  });
});

// ---------------------------------------------------------------------------
// 14. String literals
// ---------------------------------------------------------------------------

describe("string literals", () => {
  it("highlights string inside __FUNC_SIG", () => {
    const html = highlight('__FUNC_SIG("test(address,uint256)")', "huff");
    assertSpan(html, "hljs-string", '"test(address,uint256)"');
  });

  it("highlights standalone string", () => {
    const html = highlight('"hello"', "huff");
    assertSpan(html, "hljs-string", '"hello"');
  });
});

// ---------------------------------------------------------------------------
// 15. Full macro snippet
// ---------------------------------------------------------------------------

describe("full macro snippet", () => {
  const snippet = `
#define function addWord(uint256) pure returns (uint256)

#define constant OWNER = FREE_STORAGE_POINTER()

#define event WordAdded(uint256 initial, uint256 increment)

#define macro ADD_WORD() = takes (1) returns (1) {
    // Input Stack: [input_num]
    caller          // [msg.sender, input_num]
    [OWNER] sload   // [owner, msg.sender, input_num]
    eq              // [owner == msg.sender, input_num]
    is_owner jumpi  // [input_num]

    0x00 0x00 revert

    is_owner:
        dup1                     // [input_num, input_num]
        <increment>              // [increment, input_num, input_num]
        __EVENT_HASH(WordAdded)  // [sig, increment, input_num, input_num]
        0x00 0x00
        log3                     // [input_num]

        0x20                     // [0x20, input_num]
        add                      // [0x20 + input_num]
}

#define macro MAIN() = takes (0) returns (0) {
    0x00 calldataload
    0xE0 shr
    __FUNC_SIG(addWord) eq add_word jumpi
    0x00 0x00 revert

    add_word:
        0x04 calldataload
        ADD_WORD()
        0x00 mstore
        0x20 0x00 return
}
`.trim();

  it("compiles without errors", () => {
    assert.doesNotThrow(() => highlight(snippet, "huff"));
  });

  it("highlights #define function as meta", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-meta", "#define");
  });

  it("highlights `macro` keyword", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-keyword", "macro");
  });

  it("highlights macro name ADD_WORD as title.function", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-title function_", "ADD_WORD");
  });

  it("highlights `takes` keyword", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-keyword", "takes");
  });

  it("highlights `returns` keyword", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-keyword", "returns");
  });

  it("highlights constant reference [OWNER]", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-variable", "[OWNER]");
  });

  it("highlights calldataload opcode", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "calldataload");
  });

  it("highlights __EVENT_HASH builtin", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "__EVENT_HASH");
  });

  it("highlights __FUNC_SIG builtin", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "__FUNC_SIG");
  });

  it("highlights is_owner label definition", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-symbol", "is_owner");
  });

  it("highlights comment", () => {
    assert.match(
      highlight(snippet, "huff"),
      /class="hljs-comment"/,
      "Inline comment should be highlighted"
    );
  });
});

// ---------------------------------------------------------------------------
// 16. Custom errors snippet
// ---------------------------------------------------------------------------

describe("custom errors snippet", () => {
  const snippet = `
#define error PanicError(uint256)
#define error Error(string)

#define macro PANIC() = takes (1) returns (0) {
    // Input stack: [panic_code]
    __ERROR(PanicError)   // [panic_error_selector, panic_code]
    0x00 mstore           // [panic_code]
    0x04 mstore           // []
    0x24 0x00 revert
}
`.trim();

  it("highlights error keyword", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-keyword", "error");
  });

  it("highlights PanicError name as title.function", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-title function_", "PanicError");
  });

  it("highlights __ERROR builtin", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "__ERROR");
  });

  it("highlights revert opcode", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "revert");
  });
});

// ---------------------------------------------------------------------------
// 17. Jump table snippet
// ---------------------------------------------------------------------------

describe("jump table snippet", () => {
  const snippet = `
#define jumptable SWITCH_TABLE {
    jump_one jump_two jump_three jump_four
}

#define macro SWITCH_TEST() = takes (0) returns (0) {
    __tablesize(SWITCH_TABLE)   // [table_size]
    __tablestart(SWITCH_TABLE)  // [table_start, table_size]
    0x00
    codecopy

    0x04 calldataload           // [input_num]
    dup1                        // [input_num, input_num]
    0x03 lt                     // [3 < input_num, input_num]
    err jumpi

    0x20 mul                    // [0x20 * input_num]
    mload                       // [pc]
    jump                        // []

    jump_one:
        0x100 0x00 mstore
        0x20 0x00 return
    err:
        0x00 0x00 revert
}
`.trim();

  it("highlights `jumptable` keyword", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-keyword", "jumptable");
  });

  it("highlights SWITCH_TABLE as title.function", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-title function_", "SWITCH_TABLE");
  });

  it("highlights __tablesize builtin", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "__tablesize");
  });

  it("highlights __tablestart builtin", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-built_in", "__tablestart");
  });

  it("highlights jump_one label", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-symbol", "jump_one");
  });

  it("highlights err label", () => {
    assertSpan(highlight(snippet, "huff"), "hljs-symbol", "err");
  });
});

// ---------------------------------------------------------------------------
// 18. #include directive snippet
// ---------------------------------------------------------------------------

describe("#include snippet", () => {
  it("highlights include path as string", () => {
    const html = highlight('#include "huffmate/auth/Owned.huff"', "huff");
    assertSpan(html, "hljs-string", '"huffmate/auth/Owned.huff"');
  });
});

// ---------------------------------------------------------------------------
// 19. Auto-detection: Huff code should be detected as huff
// ---------------------------------------------------------------------------

describe("auto-detection — Huff snippets", () => {
  it("detects a simple macro as huff", () => {
    const code = `
#define macro MAIN() = takes (0) returns (0) {
    0x00 calldataload
    0xE0 shr
    0x00 0x00 revert
}`.trim();
    assert.equal(detect(code), "huff");
  });

  it("detects snippet with __FUNC_SIG as huff", () => {
    const code = `
#define function transfer(address, uint256) nonpayable returns (bool)

#define macro MAIN() = takes (0) returns (0) {
    0x00 calldataload 0xE0 shr
    __FUNC_SIG(transfer) eq transfer jumpi
    0x00 0x00 revert
    transfer:
        0x01 0x00 mstore
        0x20 0x00 return
}`.trim();
    assert.equal(detect(code), "huff");
  });

  it("detects snippet with #define fn as huff", () => {
    const code = `
#define fn MUL_DIV_DOWN(err) = takes (3) returns (1) {
    dup3 dup3 mul
    swap2 div
    swap1 pop
}`.trim();
    assert.equal(detect(code), "huff");
  });
});

// ---------------------------------------------------------------------------
// 20. Auto-detection: Non-Huff snippets should NOT be detected as huff
// ---------------------------------------------------------------------------

describe("auto-detection — non-Huff snippets", () => {
  it("does not detect plain JavaScript as huff", () => {
    const code = `
function multiply(a, b) {
  const result = a * b;
  console.log(result);
  return result;
}`.trim();
    assert.notEqual(detect(code), "huff");
  });

  it("does not detect Solidity as huff", () => {
    const code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;

    function set(uint256 v) external {
        value = v;
    }

    function get() external view returns (uint256) {
        return value;
    }
}`.trim();
    assert.notEqual(detect(code), "huff");
  });

  it("does not detect plain C as huff", () => {
    const code = `
#include <stdio.h>

int main(void) {
    int a = 1, b = 2;
    printf("%d\\n", a + b);
    return 0;
}`.trim();
    assert.notEqual(detect(code), "huff");
  });

  it("does not detect Rust as huff", () => {
    const code = `
use std::collections::HashMap;

fn main() {
    let mut map: HashMap<&str, i32> = HashMap::new();
    map.insert("hello", 42);
    println!("{:?}", map);
}`.trim();
    assert.notEqual(detect(code), "huff");
  });
});
