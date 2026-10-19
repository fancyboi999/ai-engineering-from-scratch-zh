# inspect-binary-layout 与加载映像

> macOS 上 inspect-binary-layout 以 capability_unavailable 拒绝；inspect-macho 则无需引擎即可读取段、节、加载命令、导入和导出。

在录制 Mac 运行 `rea inspect-binary-layout fixtures/ledger-x86_64-O1.o --format json`，退出 1，输出 JSON 错误而非布局。这不表示程序损坏。rea 6.7.0 有两种无需引擎的布局读取器，此读取器仅运行于 Linux x64。

读完本节，你能解读错误信封，指出宿主机规则；也能从 `inspect-macho` 阅读 `ledger-arm64-O1` 加载映像：四个段、17 条加载命令、六个导入、六个导出。

## 错误信封

```listing
title: macOS 上的 inspect-binary-layout
source: capture/out/04-inspect-binary-layout.json
lang: json
note: 完整文件。CLI 退出状态为 1。
---
{
  "code": "capability_unavailable",
  "category": "unsupported_provider",
  "message": "The initial real-verified pwntools artifact profile supports Linux x64 only.",
  "retryable": false,
  "remediation": {
    "action": "The initial real-verified pwntools artifact profile supports Linux x64 only."
  },
  "details": {
    "provider_id": "pwntools-elf",
    "operation": "inspect_binary_layout",
    "reason": "The initial real-verified pwntools artifact profile supports Linux x64 only."
  }
}
```

rea 所有失败都具有此结构：`code`、`category`、`message`、`retryable`、`remediation.action` 及可选 `details` 对象。provider 为 `pwntools-elf`。`process.platform` 不为 `linux` 或 `process.arch` 不为 `x64` 时，其解码器在查找 Python 前就抛出 `AnalysisCapabilityUnavailableError`。消息是同文件常量。除非宿主机是 Linux x64 且 `REA_PWNTOOLS_PYTHON` 为绝对路径，否则 MCP 服务将工具列为不可用。退出状态遵循 CLI 规则：“操作无法完成。”{{cli §Output and exit status}}

捕获工具输入 ELF 目标文件，因为 `inspect_binary_layout` 就是为 ELF 编写。Linux x64 配合 pwntools 4.15.0 时，它返回节、段、符号和重定位。[第 2.3 节](#s-rea-capabilities)说明各操作如何在调用前声明可用性，[参考](#s-ref-errors)列出捕获中的所有错误码。

## inspect-macho 及其调用工具

`inspect-macho` 是 macOS 读取器，来自 `native-macos` provider，即 “macOS native inspection utilities”。它运行七个宿主命令，将各条记为来源证据。

```listing
title: 一次 inspect-macho 运行的来源证据
source: capture/out/04-inspect-macho.json
lang: json
note: 仅保留工具名和三条命令，各项还记录可执行文件 SHA-256、退出码、输出大小。
---
"provenance": [
  {
    "tool": "lipo",
    "command": [
      "/Library/Developer/CommandLineTools/usr/bin/lipo",
      "-detailed_info",
      "$ARTIFACT"
    ],
    …
  },
  {
    "tool": "otool",
    "command": [
      "/Library/Developer/CommandLineTools/usr/bin/llvm-otool",
      "-h",
      "-l",
      "$ARTIFACT"
    ],
    …
  },
  {
    "tool": "nm",
    …
  },
  {
    "tool": "dyld_info",
    "command": [
      "/Library/Developer/CommandLineTools/usr/bin/dyld_info",
      "-imports",
      "$ARTIFACT"
    ],
    …
  },
  {
    "tool": "dyld_info",
    …
  },
  {
    "tool": "dwarfdump",
    …
  },
  {
    "tool": "vtool",
    …
  }
],
```

命令列表在 provider 内固定。先运行 `lipo -detailed_info` 发现切片；逐切片运行 `otool -h -l`、`nm -gjU --no-dyldinfo`、`dyld_info -imports`、`dyld_info -exports`、`dwarfdump --uuid`；另可选运行 `vtool -show-build`。不启动 Java，耗时几秒。预期名称缺失时，记住此限制：“导入与导出合并 dyld_info 和 nm 的结果，已剥离或被工具链隐藏的符号可能缺失。”

```figure
id: fig-3-2
kind: comparison
title: 录制 Mac 上的两种布局命令
claim: 同一主机因平台拒绝一种读取器，另一种返回 17 条加载命令，因为各自声明了前置条件。
caption: 各列从左向右读。实线箭头为调用，玫红虚线为失败，墨色虚线为回复。来自 capture/out/04-inspect-binary-layout.json 与 04-inspect-macho.json。
```

## 加载映像

```listing
title: 文件头事实与入口点
source: capture/out/04-inspect-macho.json
lang: json
note: 从 normalized_result 仅保留头部、入口点和构建元数据。rea 根据 loader.h 命名构建平台与工具代码。
---
"format": "mach-o",
"selected_architecture": {
  "name": "arm64",
  "container_file_offset": 0
},
"endian": "little",
"word_size": 64,
"file_type": "2",
"flags": [
  "0x00200085"
],
"uuid": "59A1CCA5-97D1-3661-99DA-666BC2BB38D7",
"entrypoints": {
  "items": [
    {
      "file_offset": 1488
    }
  ],
  …
},
…
"build_metadata": {
  "items": [
    {
      "platform": "MACOS",
      "minimum_os": "26.0",
      "sdk": "26.2",
      …
```

**加载命令：** Mach-O 头后列表中的一条记录，含 `cmd` 类型和 `cmdsize`。Apple 未发布文字规范，因此以 XNU 源码的 `loader.h` 为参考。`file_type` 为 2 即 `MH_EXECUTE`。标志 `0x00200085` 是 `MH_NOUNDEFS` 0x1、`MH_DYLDLINK` 0x4、`MH_TWOLEVEL` 0x80、`MH_PIE` 0x200000 的和。入口来自 `LC_MAIN`，其 `entryoff` 为 1488，即 0x5d0。加上下方 `__TEXT` 地址得到 `0x1000005d0`，即 `_main` 导出。

四条 `LC_SEGMENT_64` 命令构成加载映像。每条 `segment_command_64` 指定 `vmaddr`、`vmsize`、`fileoff`、`filesize`、两个保护字段及 `nsects`，同一命令内紧接其 `section_64` 记录。

| 段 | `vmaddr` | `vmsize` | `fileoff` | `filesize` | `initprot` | `nsects` |
|---|---|---|---|---|---|---|
| `__PAGEZERO` | `0x0` | 4294967296 | 0 | 0 | 0 | 0 |
| `__TEXT` | `0x100000000` | 16384 | 0 | 16384 | 5，读和执行 | 5 |
| `__DATA_CONST` | `0x100004000` | 16384 | 16384 | 16384 | 3，读和写 | 2 |
| `__LINKEDIT` | `0x100008000` | 16384 | 32768 | 1104 | 1，读 | 0 |

```listing
title: __TEXT 段及五个节
source: capture/out/04-inspect-macho.json
lang: json
note: 截自 segments 集合。各节省略权限、对齐和标志。
---
{
  "name": "__TEXT",
  "vm_address": "0x100000000",
  "vm_size": 16384,
  "file_offset": 0,
  "file_size": 16384,
  …
  "sections": {
    "items": [
      {
        "segment": "__TEXT",
        "name": "__text",
        "address": "0x100000500",
        "size": 576,
        "file_offset": 1280,
        …
      },
      {
        "segment": "__TEXT",
        "name": "__stubs",
        "address": "0x100000740",
        "size": 48,
        "file_offset": 1856,
        …
      },
      {
        "segment": "__TEXT",
        "name": "__cstring",
        "address": "0x100000770",
        "size": 95,
        "file_offset": 1904,
        …
      },
      {
        "segment": "__TEXT",
        "name": "__const",
        "address": "0x1000007d0",
        "size": 64,
        "file_offset": 2000,
        …
      },
      {
        "segment": "__TEXT",
        "name": "__unwind_info",
        "address": "0x100000810",
        "size": 96,
        "file_offset": 2064,
        …
      }
    ],
```

`__PAGEZERO` 预留地址空间前 4 GiB，不含文件字节，让空指针无法到达已映射内存。`__TEXT` 从 `0x100000000` 开始，映射文件前 16384 字节。其代码节 `__text` 在 `0x100000500` 存放 576 字节，[第 4 部分](#s-list-procedures-and-function-bodies)逐一说明。`__cstring` 存放格式串与五个标签，`__const` 存放[跳转表一节](#s-xrefs-and-the-jump-table)读取的两个查找表。

`__LINKEDIT` 没有节，其他加载命令通过文件偏移指向内部。

| 命令 | 文件偏移 | 大小 |
|---|---|---|
| `LC_DYLD_CHAINED_FIXUPS` | 32768 | 176 |
| `LC_DYLD_EXPORTS_TRIE` | 32944 | 104 |
| `LC_FUNCTION_STARTS` | 33048 | 8 |
| `LC_SYMTAB`，13 个符号 | `symoff` 33056，`stroff` 33304 | `strsize` 152 |
| `LC_CODE_SIGNATURE` | 33456 | 416 |

最后一条在文件大小 33872 处结束。ELF 的加载器读程序头表，链接器读节头表，两表由 ELF 头指向。Mach-O 只有一个列表，`LC_SEGMENT_64` 在命令内携带节。[第 32 课](phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch)根据规范构建两种格式的读取器，将加载命令与 ELF 对应概念逐项比较。

```figure
id: fig-3-3
kind: layers
title: ledger-arm64-O1 的加载映像
claim: 四个段将 33872 文件字节映射到三个地址范围，其他加载命令通过文件偏移指向最后一个范围。
caption: 从顶部最低地址开始读。左列是地址，右列是文件偏移，虚线框不含文件字节。来自 capture/out/04-inspect-macho.json。
```

## 导入与导出

```listing
title: 导出的函数
source: capture/out/04-inspect-macho.json
lang: json
note: 截自 exports 集合。省略 __mh_execute_header 条目、weak 和 reexport 字段。
---
"exports": {
  "items": [
    …
    {
      "name": "_grade",
      "address": "0x100000518",
      …
    },
    {
      "name": "_grade_label",
      "address": "0x100000588",
      …
    },
    {
      "name": "_main",
      "address": "0x1000005d0",
      …
    },
    {
      "name": "_percent_change",
      "address": "0x100000500",
      …
    },
    {
      "name": "_total",
      "address": "0x100000554",
      …
    }
  ],
  "total": null,
  "exhaustive": false,
  "limitations": [
    "Merged nm/dyld_info results may be incomplete for stripped binaries."
  ]
},
```

六个导出：五个函数，以及 `0x100000000` 处的 `__mh_execute_header`。六个 `libSystem` 导入：`___stack_chk_fail`、`___stack_chk_guard`、`___stderrp`、`_atoi`、`_fwrite`、`_printf`。

一个依赖：`/usr/lib/libSystem.B.dylib`。rea 只将 dylib 加载命令列为依赖，动态链接器 `/usr/lib/dyld` 留在加载命令的 `LC_LOAD_DYLINKER` 行。

导入和导出集合都标为 `exhaustive: false`，因为合并了两个工具的文本。记录不承诺列表完整，你也不应如此承诺。[第 4.2 节](#s-list-procedures-and-function-bodies)展示 Ghidra 所见的同批名称，[下一节](#s-address-to-file-offset)将 `0x100000518` 转为文件偏移。

```takeaways
- 非 Linux x64 主机运行 `inspect-binary-layout`，预期返回 `capability_unavailable`。
- 重试前先读 `code`、`category`、`details.provider_id`。
- macOS 上运行 `inspect-macho`，先读四条 `LC_SEGMENT_64`。
- 判断符号不存在前，先检查各集合的 `exhaustive`。
```

Sources: capture/out/00-commands.txt, capture/out/04-inspect-binary-layout.json, capture/out/04-inspect-macho.json; rea 6.7.0 at 27dc42d: src/contracts/errorSchemas.ts, src/native/pwntools/PwntoolsDecoder.ts, src/server/createServer.ts, src/native/NativeMachoInspection.ts, src/native/parsers/otool.ts; rea docs/cli.md
