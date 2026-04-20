import { HLJSApi, Language } from "highlight.js";

export default function huff(hljs: HLJSApi): Language {
  // ── EVM opcodes ───────────────────────────────────────────────────────────
  // Build the push/dup/swap/log families programmatically.
  const PUSH_OPS = Array.from({ length: 32 }, (_, i) => `push${i + 1}`).join(" ");
  const DUP_OPS = Array.from({ length: 16 }, (_, i) => `dup${i + 1}`).join(" ");
  const SWAP_OPS = Array.from({ length: 16 }, (_, i) => `swap${i + 1}`).join(" ");
  const LOG_OPS = Array.from({ length: 5 }, (_, i) => `log${i}`).join(" ");

  const EVM_OPCODES =
    // Arithmetic
    "stop add mul sub div sdiv mod smod addmod mulmod exp signextend " +
    // Comparison & bitwise logic
    "lt gt slt sgt eq iszero and or xor not byte shl shr sar " +
    // Hash
    "sha3 keccak256 " +
    // Environmental
    "address balance origin caller callvalue calldataload calldatasize calldatacopy " +
    "codesize codecopy gasprice extcodesize extcodecopy returndatasize returndatacopy extcodehash " +
    // Block
    "blockhash coinbase timestamp number difficulty prevrandao gaslimit chainid selfbalance basefee " +
    "blobhash blobbasefee " +
    // Stack / memory / storage
    "pop mload mstore mstore8 sload sstore tload tstore mcopy " +
    // Control flow
    "jump jumpi pc msize gas jumpdest " +
    // Push / dup / swap
    "push0 " + PUSH_OPS + " " + DUP_OPS + " " + SWAP_OPS + " " +
    // Logging
    LOG_OPS + " " +
    // System
    "create call callcode return delegatecall create2 staticcall revert invalid selfdestruct";

  // ── #include "path/to/file.huff" ──────────────────────────────────────────
  const INCLUDE = {
    className: "meta",
    begin: /#include\b/,
    end: /$/,
    contains: [hljs.QUOTE_STRING_MODE]
  };

  // ── Test decorator: #[calldata("..."), value(0x01)] ───────────────────────
  // Sits directly above a #define test and configures the transaction
  // environment (calldata bytes, call value, etc.).
  const TEST_DECORATOR = {
    className: "meta",
    begin: /#\[/,
    end: /\]/,
    contains: [hljs.QUOTE_STRING_MODE, hljs.C_NUMBER_MODE]
  };

  // ── #define <type> <name> ─────────────────────────────────────────────────
  // Handles all #define variants:
  //   #define macro  NAME(args) = takes (n) returns (m) { … }
  //   #define fn     NAME(args) = takes (n) returns (m) { … }
  //   #define test   NAME()     = { … }
  //   #define function  NAME(types) modifier returns (types)
  //   #define event     NAME(types)
  //   #define error     NAME(types)
  //   #define constant  NAME = VALUE
  //   #define jumptable NAME { … }
  //   #define jumptable__packed NAME { … }
  //   #define table     NAME { … }
  //
  // The #define token is highlighted as `meta`.  The starts: sub-mode runs
  // until the opening ( / = / { so that only the definition name is captured
  // as `title.function` — argument lists and body content are parsed by the
  // top-level rules.
  const DEFINE = {
    className: "meta",
    begin: /#define\b/,
    relevance: 10,
    starts: {
      end: /(?=\(|=|\{)/,
      contains: [
        // Definition type keyword — must be listed BEFORE the title.function
        // rule so it wins when both match at the same position.
        {
          className: "keyword",
          begin: /\b(?:jumptable__packed|jumptable|macro|fn|test|function|event|error|constant|table)\b/
        },
        { className: "title.function", begin: /[A-Za-z_]\w*/, relevance: 0 }
      ]
    }
  };

  // ── Huff compiler built-in functions ─────────────────────────────────────
  // __FUNC_SIG    — push the 4-byte function selector
  // __EVENT_HASH  — push the 32-byte event topic hash
  // __ERROR       — push the left-padded 4-byte error selector
  // __RIGHTPAD    — push the right-padded literal
  // __codesize    — push the code size of a macro / function
  // __tablestart  — push the PC of the start of a jump table
  // __tablesize   — push the size of a jump table
  const BUILTIN_FUNCTIONS = {
    className: "built_in",
    begin: /\b__(?:FUNC_SIG|EVENT_HASH|ERROR|RIGHTPAD|codesize|tablestart|tablesize)\b/,
    relevance: 8
  };

  // ── Constant reference: [CONSTANT_NAME] ──────────────────────────────────
  // At compile time the compiler replaces [NAME] with a PUSH of the constant's
  // value.  Highlighted as `variable` to make it visually distinct from plain
  // identifiers.
  const CONSTANT_REF = {
    className: "variable",
    begin: /\[[A-Za-z_]\w*\]/,
    relevance: 3
  };

  // ── Macro argument invocation: <arg_name> ────────────────────────────────
  // Inside a macro body, <name> refers to a compile-time argument (a label,
  // opcode, literal, or constant) that was passed at the call site.
  const MACRO_ARG = {
    className: "variable",
    begin: /<[A-Za-z_]\w*>/,
    relevance: 2
  };

  // ── Label definition: identifier: ────────────────────────────────────────
  // A label marks a JUMPDEST in the current macro body.  It is written as
  // a bare identifier immediately followed by a colon.
  const LABEL_DEF = {
    className: "symbol",
    begin: /\b[a-zA-Z_]\w*(?=:)/,
    relevance: 0
  };

  return {
    name: "Huff",
    aliases: ["huff"],
    keywords: {
      keyword:
        // takes / returns — stack-annotation keywords used in all definitions
        "takes returns " +
        // Function visibility / mutability modifiers (in #define function)
        "view pure payable nonpayable indexed " +
        // Special keyword used in #define constant
        "FREE_STORAGE_POINTER",
      built_in: EVM_OPCODES
    },
    contains: [
      // ── comments ──────────────────────────────────────────────────────
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,

      // ── directives ────────────────────────────────────────────────────
      INCLUDE,
      TEST_DECORATOR,
      DEFINE,

      // ── string literals (inside __FUNC_SIG / __EVENT_HASH / #include) ─
      hljs.QUOTE_STRING_MODE,

      // ── numeric literals (0x… hex and plain decimal) ──────────────────
      hljs.C_NUMBER_MODE,

      // ── compiler built-in functions ───────────────────────────────────
      BUILTIN_FUNCTIONS,

      // ── constant references [NAME] ────────────────────────────────────
      CONSTANT_REF,

      // ── macro argument invocations <name> ─────────────────────────────
      MACRO_ARG,

      // ── label definitions ─────────────────────────────────────────────
      LABEL_DEF
    ]
  };
}
