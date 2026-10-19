# 如何阅读本手册

> 本手册所有清单均来自 rea 6.7.0 与 Ghidra 12.1.4 对专用程序的一次运行记录，每条规则均可追溯到按权威性排序的来源。

本手册介绍 rea（`rea-agents` 6.7.0）与 Ghidra 12.1.4 provider。从你编译的文件出发，追踪一个问题，直到得到可检查的 Evidence 记录：函数做什么，工具又如何得知？

## 适合谁阅读

你会编写 C、Python 或 JavaScript，使用 Claude、Cursor、Codex、OpenClaw、Hermes 等编码 agent，或任何读取 SKILL.md 的 agent。你从未用反编译器读过机器码，希望检查 agent 对编译程序的判断。

读完后，你能够：

- 读取编译程序的文件头、节、符号和重定位，将地址映射为文件偏移。
- 对自己构建的程序运行带 Ghidra provider 的 rea，阅读 Evidence 记录中的置信度、权威性、限制和未知项。
- 找到函数，阅读汇编和伪代码，追踪引用，指出反编译输出不完整的位置。
- 在输入网格上运行原版与重建函数，并屏蔽重定位后比较字节，验证两者等价。
- 让 agent 通过 MCP 驱动 rea，维护证据账本，区分观察结果与推断。

另有五课深入底层实现。[ELF 课](phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch)构建文件读取器，[反汇编课](phases/13-tools-and-protocols/33-disassembly-and-control-flow)构建解码器和控制流图，[提升课](phases/13-tools-and-protocols/34-lifting-to-pseudocode)构建提升器，[证据课](phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns)构建账本，[验证课](phases/13-tools-and-protocols/36-rebuild-and-prove-equal)验证重建等价。本手册聚焦 rea 与 Ghidra。

## 编写依据

固定版本为 2026-10-18 发布的 `rea-agents` 6.7.0，标签 `rea-agents-6.7.0`，提交 `27dc42d10249f0410904a75c0997842eb03b931c`；另固定 Ghidra 12.1.4 PUBLIC（构建于 2026-Sep-21）和 OpenJDK 21.0.12.1。事实核验于 2026-10-18。6.7.0 也包含 6.6.0 的变更，后者曾打标签但未发布到 npm。WebAssembly provider、Go provider、raw-binary 格式和 `DISCLAIMER.md` 在 6.5.0 引入。本手册仅描述 6.7.0，所有捕获也已为它重新录制。

事实来自七类来源，按权威性排序。来源冲突时，以排名较高者为准，正文说明冲突。

| 排名 | 来源 | 用途 | 引用形式 |
|---|---|---|---|
| 1 | 标签处的 rea 源码，`27dc42d` | 关于 rea 行为的所有结论 | 各节末尾 Sources 行中的文件列表 |
| 2 | 标签处的 rea 文档 | 文档声明的行为、限制与使用规则 | `readme`、`cli`、`mcp`、`ghidra`、`native`、`install`、`readiness`、`ledgers`、`jsgraph` 或 `design` 加标题 |
| 3 | `capture/out/` 的运行捕获 | 全部清单及图中的数字 | 捕获文件名 |
| 4 | ELF、Mach-O、x86-64、AArch64 规范 | 格式、编码和调用约定 | `spec` 加章节 |
| 5 | 程序分析论文 | 反汇编、结构化、类型恢复、反编译器评估 | `paper` 加标题 |
| 6 | 法律条文与法院判决 | 分析与互操作的法律依据 | `law` 加引文位置 |
| 7 | 工具发布说明 | Ghidra 等工具版本 | 版本及日期 |

rea README、`DISCLAIMER.md` 和文档中的引用均已对照 `rea-agents-6.7.0` 标签页面核对。法律、规范和论文的引用来自正式文本。本仓库不复制任何来源文件。

## 捕获工具包

`capture/` 的捕获工具驱动真实 `rea` 命令行及带 Ghidra provider 的 MCP 服务，将返回内容写入 `capture/out/`，仅用 Python 标准库。`python3 capture/run.py` 记录全部内容；`python3 capture/run.py --check` 在临时目录重新记录，屏蔽每次运行会变化的值后与 `capture/out/` 比较。

运行对象需要 Ghidra、JDK 和 Node，因此工具包无法在仓库 CI 中运行。缺少 rea 6.7.0、Ghidra 12.1.4 或 JDK 21 时，`--check` 打印 `skipped` 及原因，退出码为 0。`capture/out/` 全部文件录制于同一台主机：

| 项目 | 值 |
|---|---|
| 主机 | Apple silicon 笔记本，macOS 26.2，构建 25C56，arm64 |
| rea | `rea-agents` 6.7.0 来自 npx 缓存, Node 22.22.0 |
| Ghidra | 12.1.4 PUBLIC 来自 Homebrew, `GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec` |
| JDK | OpenJDK 21.0.12.1 来自 Homebrew, `JAVA_HOME=/opt/homebrew/opt/openjdk@21` |
| clang | Apple clang 17.0.0, target `arm64-apple-darwin25.2.0` |
| 录制日期 | 2026-10-18 |

工具包在 `00-commands.txt` 记录每条独立命令及退出状态、耗时；在 `10-mcp-*.json` 记录一次含 25 轮交互的 MCP 会话，另有两个 Evidence bundle。完整运行约 125 秒，每条依赖 Ghidra 的独立命令约 7 到 9 秒。在录制主机上两次运行产生相同记录（capture/README.md）。测试固件均为本手册专门编写，hash 列于 `00-fixtures.txt`。

## 约定

命令中的 `rea` 均指 6.7.0 命令行。工具包通过 npx 缓存中的 `node .../node_modules/rea-agents/scripts/rea.mjs` 启动，`rea mcp` 指同包的 MCP 服务。

`$CAPTURE` 表示捕获目录，`$OUT` 表示 `capture/out/`，`$WORK` 表示工具包工作目录，`$HOME` 表示主目录。每次运行变化的值表示为 `<hash>`、`<ts>` 等占位符。地址按 rea 输出，使用小写 `0x` 十六进制。前导 `_` 的 `_percent_change` 是 Mach-O 符号，`percent_change` 则是 C 名称和 ELF 符号。

引用指向具体位置。`{{cli Choose a provider}}` 指标签处 rea 文档页面中的标题，`{{readme}}` 指 README。各节依据的 rea 源文件在末尾 Sources 行列出一次，均为固定标签版本。`capture/out/06-function-percent-change.json` 等捕获路径指录制文件。清单原样复制捕获文件的行，`…` 标记截取，说明见注释。

网页中的图会播放动画，可点重播按钮再看一遍。印刷和减少动态效果模式显示最终帧。

## 第一次运行

需要 rea 6.7.0、Ghidra 12.1.4，以及 `PATH` 或 `JAVA_HOME` 中的 JDK 21。安装后，本次运行不访问网络。导出两个路径，再运行 doctor：

```bash
export GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
rea doctor --provider ghidra --format json
```

录制 Mac 上的报告开头如下：

```listing
title: Ghidra 范围的 doctor 结论
source: capture/out/01-doctor-ghidra.json
lang: json
note: 仅保留两个结论和检查范围。省略的九项检查将在第 2.2 节解读。
---
{
  "healthy": true,
  "environment_healthy": false,
  "scope": {
    "mode": "explicit",
    "clients": [],
    "providers": [
      "ghidra"
    ],
    "skill": false,
    "target": null
  },
…
```

接着构建测试固件。将 `capture/fixtures/ledger.c` 与 `ledger-main.c` 复制到临时工作目录并编译：

```bash
clang -O1 -o ledger-arm64-O1 ledger.c ledger-main.c
rea function ledger-arm64-O1 _percent_change --provider ghidra --format json
```

不同 clang 生成不同字节，SHA-256 和 `evidence_id` 也会改变，因此你的这些字段会与捕获不同。捕获中的运行记录如下：

```listing
title: 第一个问题
source: capture/out/00-commands.txt
lang: text
note: 省略耗时，因为每次录制都会变化，保持在 7 到 9 秒之间。
---
$ rea function fixtures/ledger-arm64-O1 _percent_change --provider ghidra --format json
[exit 0] (… s) -> 06-function-percent-change.json
```

将 `capture/out/06-function-percent-change.json` 与自己的输出并排打开。[第 1.2 节](#s-rea-function-end-to-end)逐字段解读。

## 各部分顺序

第 1 部分用一页介绍 rea，第 2 部分讲分析权利与安装，第 3 到 5 部分拆解一次调查：文件本身、Ghidra provider、Evidence 记录。第 6 部分讲 JavaScript 与 WebAssembly，第 7 部分在 rea 之外验证重建等价，第 8 部分由 agent 驱动 rea，参考部分提供速查表：

```parts
```

## 图表颜色

每种色相在所有图中保持相同含义：

```palette
```

[此图](#fig-0-1)用录制 MCP 会话的交互介绍八种箭头样式。

```figure
id: fig-0-1
kind: sequence
title: 如何阅读本手册的时序图
claim: 八种箭头样式分别表示一种交互；除模型调用外，所有标签均为录制会话中的真实名称或消息。
caption: 各编号行从箭尾读到箭头，标签下的注释说明样式。第 1 到 8 行来自 capture/out/10-mcp-03-open-binary-O1.json、10-mcp-09-analyze-function-percent-change-O1.json、10-mcp-13-analyze-function-missing.json、10-mcp-14-export-evidence-bundle-O1.json、10-mcp-server.log。第 9 行是工具包不记录的模型调用。
```

第 9 行的模型调用属于 agent，[第 8 部分](#p-8)为它绘制独立生命线。

Sources: manual.json; rea LICENSE, DISCLAIMER.md; capture/README.md; capture/run.py; capture/fixtures/ledger.c, ledger-main.c; capture/out/00-commands.txt, 00-fixtures.txt, 00-versions.txt, 01-doctor-ghidra.json, 06-function-percent-change.json, 10-mcp-03-open-binary-O1.json, 10-mcp-09-analyze-function-percent-change-O1.json, 10-mcp-13-analyze-function-missing.json, 10-mcp-14-export-evidence-bundle-O1.json, 10-mcp-server.log, 10-mcp-session.txt
