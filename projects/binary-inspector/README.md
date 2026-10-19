# 二进制检查器

静态读取你编译的 ELF、PE/COFF 和 Mach-O 文件，报告布局、名称、链接和函数入口。

输入 ELF64 目标文件、COFF 目标文件、PE32+ 映像或 Mach-O 64 文件。检查器报告格式、架构、节和段的权限与熵，以及还原 C++ 名称后的符号、导入、导出、重定位、Mach-O 链式修正、字符串所属的节和函数入口。以相同源代码的未剥离构建为基准，计算每种函数入口识别方法的精确率和召回率。最终输出 JSON 报告、带字节图的独立 HTML 报告，以及两个构建的差异。

仅需 Python 3.10 或更高版本及标准库。评分器也使用 Python。测试固件已经编译好，只有重建时才需要 clang。

## 范围与规则

本项目的每个输入都来自测试固件中由你自行编译的源代码。仅检查自己的构建。检查器只读取文件，从不执行文件，也不移除保护、脱壳或分析第三方软件。[第32课](../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md)说明了本路径所有分析目标必须遵守的授权规则。

## 构建并运行你的实现

在仓库根目录执行一次初始化。初始模板在阶段 1 失败是预期行为。

```bash
python3 scripts/project_test.py binary-inspector --init learning-artifacts/binary-inspector
python3 scripts/project_test.py binary-inspector --stage 1 --path learning-artifacts/binary-inspector --strict
```

工作区为每个阶段提供一个桩模块，另有 CLI、报告的 JSON Schema 和测试固件。实现各阶段后，运行累计评分器，并用 CLI 检查文件：

```bash
python3 scripts/project_test.py binary-inspector --all --path learning-artifacts/binary-inspector --strict
cd learning-artifacts/binary-inspector
python3 cli.py inspect fixtures/tally-arm64-O2.stripped --truth fixtures/tally-arm64-O2 --json report.json --html report.html
python3 cli.py diff fixtures/tally-arm64-O0 fixtures/tally-arm64-O2 --json diff.json
python3 cli.py inspect path/to/your-own-build.o
```

CLI 和测试固件属于预置脚手架。CLI 导入的是你的模块。[API 契约](API.md) 列出全部公开函数及其返回结构。

## 单独检查参考实现

```bash
python3 scripts/project_test.py binary-inspector --all --solution --strict
cd projects/binary-inspector/solution
python3 cli.py inspect fixtures/tally-arm64-O2.stripped --truth fixtures/tally-arm64-O2 --json report.json --html report.html
```

## 观察结果

演示命令读取剥离符号后的 arm64 可执行文件。strip 删除了所有已定义符号，因此 `symbols` 方法在 6 个函数入口中找到 0 个。`LC_FUNCTION_STARTS` 仍列出全部 6 个。直接 `bl` 目标找到 5 个，因为没有代码调用 `main`。序言扫描只找到 1 个，因为 `-O2` 下的五个 tally 函数没有栈帧。来自 `libSystem` 的四个导入由链式修正提供，并带有 dyld 填充的各槽地址。

## 测试固件

测试固件目录包含两个 C 文件、一个 C++ 文件、构建脚本以及 Apple clang 17 的编译产物：

| 目标 | 文件 |
|---|---|
| x86-64 Linux ELF 目标文件 | `tally` 的 `-O0` 和 `-O2` 版本、`main` 的 `-O2` 版本、`names.cpp` 的 `-O2` 版本 |
| x86-64 Windows MSVC COFF 目标文件 | `tally` 的 `-O0` 和 `-O2` 版本、`main` 的 `-O2` 版本 |
| arm64 macOS Mach-O | `tally-arm64-O2.o`, `-O0` 和 `-O2` 可执行文件、剥离符号后的 `-O2` 副本、一个 dylib 及其剥离符号副本 |
| PE32+ 映像 | Python 脚本逐字段写入的小型映像，因为编写时的工具链没有 Windows 链接器 |

用测试固件目录中的构建脚本重建。脚本会写入新的 SHA-256 校验和列表。已提交的列表记录测试所描述的构建。重建 `-O0` 可执行文件时，包含目标文件路径的调试映射条目可能不同。测试读取已提交的文件。

第二个程序 `meter` 是留出测试案例。其源代码、构建脚本和二进制文件位于工作区外，只有测试读取它们。

## 限制

- 支持小端 ELF64 和 Mach-O 64、x86-64 与 arm64 的 COFF 目标文件，以及 PE32+ 映像。ELF32、PE32、大端文件和通用 Mach-O 文件会失败，并给出说明原因的消息。
- 链式修正支持指针格式 2 和 6。arm64e 格式会失败并给出消息。
- 名称解码器仅覆盖文档规定的 Itanium 子集，对其余名称（包括 MSVC 名称）返回 `None`。
- 序言扫描和调用目标扫描支持 x86-64 与 arm64。

## 阶段

1. [识别格式并解析文件头](stages/01-headers/docs/zh.md)
2. [节、段、权限与熵](stages/02-layout/docs/zh.md)
3. [符号、字符串表与名称还原](stages/03-symbols/docs/zh.md)
4. [导入、导出、重定位与链式修正](stages/04-linkage/docs/zh.md)
5. [字符串归属与函数入口恢复](stages/05-discovery/docs/zh.md)
6. [JSON 报告、HTML 字节图与构建差异](stages/06-report/docs/zh.md)

## 本项目应用的课程

- [32，程序解剖：从零构建 ELF 读取器](../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md)
- [40，链接、加载与符号剥离](../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md)
- [41，恢复数据与类型](../../phases/13-tools-and-protocols/41-recovering-data-and-types/docs/zh.md)

## 主要参考资料

- [System V gABI](https://www.sco.com/developers/gabi/latest/contents.html)
- [Microsoft PE Format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [Apple mach-o/loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h) 与 [mach-o/fixup-chains.h](https://github.com/apple-oss-distributions/dyld/blob/main/include/mach-o/fixup-chains.h)
- [Itanium C++ ABI, mangling](https://itanium-cxx-abi.github.io/cxx-abi/abi.html#mangling)
