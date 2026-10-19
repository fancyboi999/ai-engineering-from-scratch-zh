# 逆向工程入门

介绍 rea（`rea-agents` 6.7.0）与 Ghidra 12.1.4 provider，从第一次 `rea doctor` 到通过 MCP 维护证据账本的 agent。中文版网页位于 [aieng-zh.cn/manual-reverse-engineering-101.html](https://aieng-zh.cn/manual-reverse-engineering-101.html)。上游课程每次发布将 PDF 附件命名为 `aiefs-manual-reverse-engineering-101.pdf`。

## 内容

- 8 部分、26 节正文，另有六节参考内容。第 1 部分用一页介绍 rea，第 2 部分讨论分析权利与安装，第 3 到 5 部分介绍分析产物、Ghidra provider 和 Evidence 记录，第 6 部分介绍 JavaScript 与 WASM，第 7 部分验证重建等价，第 8 部分让 agent 驱动 rea。
- 封面图及图索引中的各图，用图表工具包根据捕获文件绘制。网页版播放动画，印刷版显示最终帧。
- `capture/` 中的捕获工具仅用 Python 标准库。它运行真实 `rea` 命令行及带 Ghidra 的 MCP 服务，将返回内容写入 `capture/out/`。
- 从 `capture/out/` 截取的清单，以及对照标签处 rea README 与文档核对过的引用。
- 四个专为本手册编写的测试程序：含四个函数的 `ledger.c`、`ledger-main.c`、含六个文件的 JavaScript 应用、WebAssembly 文本模块。另有 rea 6.5.0 写出的 Evidence bundle，以及供 `rea setup` 使用的两个小型 Claude Code 配置文件。

## 文件

| 路径 | 内容 |
|---|---|
| `manual.json` | 声明文件：固定版本、部分、调色板、来源、封面图 |
| `front.md`, `sections/` | 正文，每节一个文件 |
| `figures/src/` | 图表源文件，构建为 `figures/*.svg` |
| `capture/` | 捕获工具、测试固件，以及 `capture/out/` 中的运行记录 |
| `examples/` | `mcp-registration.json`，第 8.1 节列出的 MCP 注册配置 |

## 固定版本

| 项目 | 值 |
|---|---|
| rea | `rea-agents` 6.7.0, 发布于 2026-10-18，标签 `rea-agents-6.7.0`, 提交 `27dc42d10249f0410904a75c0997842eb03b931c` |
| Ghidra | 12.1.4 PUBLIC, 构建于 2026-Sep-21 |
| JDK | OpenJDK 21.0.12.1 |
| 核验日期 | 2026-10-18 |

6.7.0 包含 6.6.0 的变更，后者曾打标签但未发布到 npm。WebAssembly 与 Go provider、raw-binary 格式、`DISCLAIMER.md` 在 6.5.0 引入。本手册所有结论描述 6.7.0，全部捕获也已用它重新录制。

## 录制主机

工具包在一台运行 macOS 26.2 的 Apple silicon Mac 上录制，版本如下：

| 项目 | 版本 |
|---|---|
| rea | `rea-agents` 6.7.0 来自 npx 缓存, Node 22.22.0 |
| Ghidra | 12.1.4 来自 Homebrew, `GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec` |
| JDK | OpenJDK 21.0.12.1 来自 Homebrew, `JAVA_HOME=/opt/homebrew/opt/openjdk@21` |
| clang | Apple clang 17.0.0 |
| WABT | 1.0.42，来自 Homebrew。`inspect-wasm-artifact` 通过 `REA_WABT_BIN_DIRECTORY` 运行工具。 |

## 运行捕获工具

```bash
cd manuals/reverse-engineering-101
python3 capture/run.py --check
```

检查会在临时目录重新捕获，屏蔽时间戳、耗时、运行 id、临时路径和进程 id 后，逐文件与 `capture/out/` 比较。缺少 rea 6.7.0、Ghidra 12.1.4 或 JDK 21 时，打印 `skipped` 及原因，退出码为 0。在录制主机上完整运行约需 125 秒；`capture/README.md` 列出全部输出文件和截取位置。

运行 `python3 capture/run.py` 重新录制，运行 `python3 capture/run.py --build-fixtures` 重建二进制测试固件。不同 clang 会改变可执行文件与目标文件，也会改变 `capture/out/` 的全部 SHA-256、`evidence_id`、bundle 摘要，因此重建后必须重新录制。

## 构建与检查

在仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/reverse-engineering-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual reverse-engineering-101
```

主机装有 rea、Ghidra 和 JDK 时，审计运行完整捕获检查，约两分钟。设置 `AIEFS_CAPTURE_SKIP=1` 可跳过。审计必须报告 `TOTAL 0`。契约见 [manuals/AUTHORING.md](../AUTHORING.md)。
