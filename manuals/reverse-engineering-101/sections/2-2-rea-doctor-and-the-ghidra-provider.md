# rea doctor 与 Ghidra provider

> rea doctor 对 Ghidra 范围运行九项检查，只有安装目录、版本、analyzeHeadless、原生反编译器和 JDK 21 全部通过，provider 才可用。

你用 `npm` 安装 rea、用 Homebrew 安装 Ghidra，第一次 `rea function` 却以 `provider_unavailable` 结束。消息让你运行 `rea doctor`。报告针对 Ghidra 范围列出九项检查，各有名称、`ok` 标志和发现的路径或版本。第一项失败检查指出该修复什么。

读完本节，你能阅读 doctor 报告，找出失败检查，按修复建议修正安装。

## Ghidra provider 的要求

**Ghidra provider：** rea 中通过 `analyzeHeadless` 驱动现有 Ghidra 安装的适配器。需要环境变量 `GHIDRA_INSTALL_DIR`、`JAVA_HOME` 提供绝对路径，拒绝相对路径。策略固定版本：`SUPPORTED_GHIDRA_VERSION = "12.1.4"`、`SUPPORTED_GHIDRA_JAVA_MAJOR = 21`。安装文档要求 Ghidra 12.1.x，并要求 JDK 版本符合该安装 `application.java.min` 与 `application.java.max` 属性，且为 64 位完整 JDK {{install Ghidra}}。`Ghidra/Features/Decompiler/os/<platform>/` 还必须包含适配宿主机的原生反编译器。REA 不构建或安装原生工具，也不会更改 Gatekeeper 隔离设置 {{install Ghidra}}。

录制 Mac 上，Homebrew 将两个工具安装到以下位置：

```listing
title: 录制 Mac 的 Ghidra 与 JDK 路径
source: capture/out/00-versions.txt
lang: text
note: 仅保留 Ghidra 与 Java 块。省略 rea、node、clang、llvm-objdump、macOS、WABT 块。
---
…
GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec
application.build.date=2026-Sep-21 2017 GMT
application.version=12.1.4
application.release.name=PUBLIC

JAVA_HOME=/opt/homebrew/opt/openjdk@21
$ /opt/homebrew/opt/openjdk@21/bin/java -version
openjdk version "21.0.12.1" 2026-08-18
OpenJDK Runtime Environment Homebrew (build 21.0.12.1)
OpenJDK 64-Bit Server VM Homebrew (build 21.0.12.1, mixed mode, sharing)
[exit 0]
…
```

安装文档要求先在 REA 之外解压 Ghidra 并安装 JDK，再导出两个工具的绝对路径 {{install Ghidra}}。使用 Homebrew 的 Mac 上为：

```bash
export GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
rea doctor --provider ghidra --format json
```

`--provider ghidra` 将报告缩小到一个范围。不带该参数时，还检查 Hopper、IDA、JADX、Kuna provider、已安装 skill 及本机 agent 注册。

## 九项检查

```listing
title: Ghidra 范围的 doctor 报告
source: capture/out/01-doctor-ghidra.json
lang: json
note: 保留开头、首项检查和两项读取安装的检查，省略其余六项。
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
  "scope_checks": [
    {
      "name": "node",
      "ok": true,
      "classification": "healthy",
      "detail": "22.22.0",
      "details": {
        "runtime": "node",
        "version": "22.22.0"
      }
    },
    …
    {
      "name": "ghidra-native_decompiler",
      "ok": true,
      "classification": "healthy",
      "detail": "/opt/homebrew/Cellar/ghidra/12.1.4/libexec/Ghidra/Features/Decompiler/os/mac_arm_64/decompile reports mach-o arm64, which matches darwin/arm64"
    },
    {
      "name": "ghidra-java",
      "ok": true,
      "classification": "healthy",
      "detail": "21.0.12.1; 64-bit; JDK; /opt/homebrew/Cellar/openjdk@21/21.0.12.1/libexec/openjdk.jdk/Contents/Home; accepted a 64-bit full JDK 21 or newer"
    }
  ]
}
```

`inspectGhidraInstallation` 不导入任何文件即可运行八项 Ghidra 检查，顺序为 `configuration`、`platform`、`architecture`、`installation`、`version`、`headless`、`native_decompiler`、`java`，doctor 为名称添加 `ghidra-` 前缀。最前面另有 `node` 检查。下表列出读取内容和失败代码。

| 检查 | 读取内容 | 录制 Mac 的值 | 失败代码 |
|---|---|---|---|
| `node` | Node 版本 | `22.22.0` | `missing_dependency` |
| `ghidra` | `GHIDRA_INSTALL_DIR`，已设置且为绝对路径 | `/opt/homebrew/Cellar/ghidra/12.1.4/libexec` | `not_configured` |
| `ghidra-platform` | 宿主 OS | `darwin` | `unsupported_host` |
| `ghidra-architecture` | 宿主 CPU | `arm64` | `unsupported_host` |
| `ghidra-installation` | 安装下的 `Ghidra/application.properties` | properties 文件 | `executable_missing` |
| `ghidra-version` | 对照 12.1.x 检查 `application.version` | `12.1.4` | `unsupported_version` 或 `version_unresolved` |
| `ghidra-headless` | `support/analyzeHeadless`，Windows 为 `.bat` | `support/analyzeHeadless` | `executable_missing` |
| `ghidra-native_decompiler` | `Ghidra/Features/Decompiler/os/mac_arm_64/decompile` 及其可执行头 | `mach-o arm64`，匹配 `darwin/arm64` | `executable_missing` |
| `ghidra-java` | JDK 主版本是否匹配 `application.java.min`、64 位、存在 `javac` | `21.0.12.1`、64 位、JDK | 各失败属性有独立代码 |


原生反编译器检查读取 `decompile` 二进制的可执行头，与宿主机比较。因此检查会读取二进制可执行头并与宿主机比较，因此会将其他平台的构建报告为不兼容，而不会只按目录名判定 {{install Ghidra}}。Doctor 会校验平台、架构、Ghidra 12.1.x 应用版本、headless 启动程序、安装要求的 Java 主版本范围、64 位 JDK，以及 `javac` 是否存在 {{install Ghidra}}。[此图](#fig-2-2)按顺序展示九项检查。

```figure
id: fig-2-2
kind: flow
title: rea doctor 针对 Ghidra 的九项检查
claim: rea doctor 按固定顺序检查 Ghidra 范围，录制 Mac 的九项检查均通过，并报告发现的路径或版本。
caption: 从左到右、再向下阅读，底部两框是报告的两个结论。数据来自 capture/out/01-doctor-ghidra.json 与 00-commands.txt，顺序来自固定标签的 src/ghidra/GhidraInstallation.ts。
```

## healthy 与 environment_healthy

报告有两个结论。`healthy` 针对选定范围，此处为含 `providers: ["ghidra"]` 的 `explicit`，`scope_checks` 只列该范围检查。`environment_healthy` 针对整套审计检查，仅在 provider 之外的检查全通过、所有已配置 provider 全通过，且至少一个 provider 可用时为真。

录制 Mac 上 `healthy` 为真，`environment_healthy` 为假。Hopper、IDA、Kuna 未配置，公式忽略它们；Ghidra 已配置且通过。因此假值来自 Ghidra 范围之外的检查，位于捕获 `--filter-output` 排除的集合中，该集合涉及用户的 skill 安装及 agent 注册（capture/README.md）。退出状态跟随选定范围：`rea doctor` 返回 0（capture/out/00-commands.txt），REA 将不可用的可选 provider 作为信息提示；它不会阻止无关任务 {{cli Output and exit status}}。

## 检查失败时

捕获主机已安装 Ghidra，因此没有录制失败的 doctor。源码说明预期结果：未设置 `GHIDRA_INSTALL_DIR` 时，`configuration` 失败，详情为 `GHIDRA_INSTALL_DIR is not set`，修复建议为 `Set GHIDRA_INSTALL_DIR to an extracted Ghidra 12.1.x release directory.`；路径为相对值时，详情为 `GHIDRA_INSTALL_DIR must be absolute`。

这类主机上的 `rea function --provider ghidra` 在选择 provider 时失败，代码 `provider_unavailable`，类别 `unavailable`，`retryable: true`。消息为 `The selected analysis provider is unavailable. Review the reported local diagnostics or run rea doctor, then retry.`。`details.rejections[].diagnostics.checks[]` 包含与 doctor 相同的八项检查。[第 2.3 节](#s-rea-capabilities)展示 `rea capabilities` 内的诊断，[错误参考](#s-ref-errors)列出代码。

有一项问题无法在 rea 内修复。macOS 上所有 Ghidra 记录都携带限制：“macOS 会话需要匹配、可执行的 Ghidra 原生反编译器；REA 会检查，但不构建原生组件，也不改变 Gatekeeper 隔离状态。”（capture/out/06-function-percent-change.json）。Homebrew 的 `decompile` 缺失或被隔离时，应修复 Ghidra。

```takeaways
- 第一条 rea 命令前，将 `GHIDRA_INSTALL_DIR`、`JAVA_HOME` 导出为绝对路径。
- 运行 `rea doctor --provider ghidra --format json`，在 `scope_checks` 查找首个 `ok: false`。
- 根据检查的修复建议修正安装，再运行 doctor。
- `environment_healthy` 表示整机报告，`healthy` 表示所选范围结论。
```

Sources: install Ghidra (rea docs/installation.md); cli Output and exit status (rea docs/cli.md); rea at 27dc42d: src/config/environment.ts, src/ghidra/GhidraInstallationPolicy.ts, src/ghidra/GhidraReleasePolicy.ts, src/ghidra/GhidraInstallation.ts, src/ghidra/GhidraDoctor.ts, src/application/Doctor.ts, src/application/DoctorDiagnostics.ts, src/application/DoctorProviderIds.ts, src/domain/providerSelectionError.ts, src/domain/analysisErrorProjection.ts; capture/README.md; capture/out/00-commands.txt, 00-versions.txt, 01-doctor-ghidra.json, 06-function-percent-change.json
