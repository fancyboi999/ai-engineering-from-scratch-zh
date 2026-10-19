# 来源

> 按权威性排序：一个固定源码树、对应文档、一次捕获记录，以及规范、论文与法律。

固定版本为 `rea-agents` 6.7.0，即 2026-10-18 发布的 npm 包。其标签 `rea-agents-6.7.0` 对应 `github.com/morluto/rea` 的提交 `27dc42d10249f0410904a75c0997842eb03b931c`。提供器为 Ghidra 12.1.4，配合 OpenJDK 21.0.12.1。原手册在 2026-10-18 对该提交的只读检出核验事实，各 Sources 行中的文件均为该检出中的路径。

## 来源优先级

两个来源冲突时，以排名更高者为准，章节会明确说明。

| 排名 | 来源 | 用途 | 引用形式 |
|---|---|---|---|
| 1 | `27dc42d` 的 rea 源码 | 关于 rea 工作方式的全部声明 | Sources 行中的文件 |
| 2 | `27dc42d` 的 rea 文档 | 已记录行为、限制与负责任使用规则 | `{{mcp ...}}`、`{{cli ...}}`、`{{install ...}}` 及下方其他键 |
| 3 | 2026-10-18 记录的 `capture/out/` | 每份 listing 与每个图表数值 | 文件名 |
| 4 | 格式与架构规范 | ELF、Mach-O、x86-64、AArch64、调用约定 | `{{spec ...}}` |
| 5 | 程序分析与反编译器评估论文 | 反汇编、提升、类型恢复与 2026 年测量 | `{{paper ...}}` 与链接 |
| 6 | 法律与判例 | 分析和互操作性的法律 | `{{law ...}}` |
| 7 | 工具发行说明 | Ghidra 与其他工具版本 | 文件 |

每个 quote 键都在 `manual.json` 中声明为 `null`，因为此仓库未复制来源文件。引文在原手册编写时对固定标签核查，该标签不变。

## rea 文档

每个 quote 键指定 `rea-agents-6.7.0` 标签下 rea 仓库的一页文档。仓库使用 MIT 许可证，版权为 2026 morluto。

| 键 | rea 仓库中的路径 |
|---|---|
| `readme` | `README.md` |
| `cli` | `docs/cli.md` |
| `mcp` | `docs/mcp-contracts.md` |
| `ghidra` | `docs/ghidra-provider.md` |
| `native` | `docs/native-investigation.md` |
| `install` | `docs/installation.md` |
| `readiness` | `docs/reconstruction-readiness.md` |
| `ledgers` | `docs/reconstruction-obligation-ledgers.md` |
| `jsgraph` | `docs/javascript-application-graph.md` |
| `design` | `docs/tool-design.md` |

`DISCLAIMER.md` 位于该标签根目录，[第 2.1 节](#s-the-readme-use-rule-and-the-law)解读它。

## 捕获记录

`capture/` 中的捕获工具在一台 Apple silicon Mac 上驱动 rea 6.7.0 及其 MCP 服务，向 `capture/out/` 写入 69 个文件。宿主机使用 macOS 26.2、Node 22.22.0、Homebrew 安装的 Ghidra 12.1.4、OpenJDK 21.0.12.1、Apple clang 17.0.0，以及供 `inspect-wasm-artifact` 使用的 WABT 1.0.42（capture/out/00-versions.txt）。目标是为本手册编写、放在 `capture/fixtures/` 下的程序，各文件 SHA-256 见 `capture/out/00-fixtures.txt`。

原始捕获使用 `python3 capture/run.py --check` 将整组内容重新记录到临时目录，再与 `capture/out/` 比较。比较遮蔽时间戳、时长、标识和临时路径，69 个文件全部匹配。Evidence 标识是内容 hash，不遮蔽、直接比较。`17-*` 文件不是 rea 输出，而是捕获工具使用宿主 clang，在 `ledger-x86_64-O1.o` 上运行[第 36 课](phases/13-tools-and-protocols/36-rebuild-and-prove-equal)两部分证明的结果。

## 外部来源

第 7、8 部分通过 URL 引用了两项外部研究。第一项为 Liu、Raff、Micinski 的 When LLM Decompilers Recompile More and Preserve Less，arXiv 2609.05370，2026。第二项为 Santos-Grueiro 的 When Binaries Talk Back，arXiv 2607.12507，2026。第 7 部分还引用两份规范：Intel 64 and IA-32 Architectures Software Developer's Manual，Volume 2，以及 Arm Architecture Reference Manual for A-profile，DDI 0487。

Sources: manual.json (pin, sources, quoteSources, capture); rea LICENSE; capture/README.md; capture/out/00-versions.txt, 00-fixtures.txt
