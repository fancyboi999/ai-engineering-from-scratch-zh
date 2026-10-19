# 第 34 课夹具

ledger.c 是《逆向工程 101》的共用夹具。本课保留副本，以便独立运行。

## 目标文件

原始构建环境为 macOS 26.2 arm64、Apple clang 17.0.0（clang-1700.6.3.2）。两份构建均可逐字节重现。

| 文件 | 命令 | SHA-256 |
|---|---|---|
| `ledger-x86_64-O1.o` | `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O1.o` | `9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f` |
| `ledger-x86_64-O0.o` | `clang -target x86_64-unknown-linux-gnu -O0 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O0.o` | `b2046c121930d3d1e5ba84ba796f9e9e161df2fe76f7b9dcf8db63f690447e13` |

## 参考反汇编

ledger-x86_64-O1.objdump.txt 与 ledger-x86_64-O0.objdump.txt 来自以下命令：

```bash
/Library/Developer/CommandLineTools/usr/bin/llvm-objdump -d -r ledger-x86_64-O1.o
/Library/Developer/CommandLineTools/usr/bin/llvm-objdump -d -r ledger-x86_64-O0.o
```

工具为 Apple LLVM 17.0.0，测试要求 ../main.py 的解码器与每行一致。

## 通过 rea 获取 Ghidra 伪代码

ghidra/percent_change.json、ghidra/grade.json、ghidra/total.json 为 rea 6.5.0 使用 Ghidra 12.1.4 执行 decompile（procedure_pseudo_code）返回的 Evidence。原始运行日期 2026-10-14，环境 macOS 26.2 arm64、OpenJDK 21.0.12.1：

```bash
export GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
npx -y rea-agents@6.5.0 decompile "$PWD/ledger-x86_64-O1.o" percent_change --provider ghidra --format json
npx -y rea-agents@6.5.0 decompile "$PWD/ledger-x86_64-O1.o" grade --provider ghidra --format json
npx -y rea-agents@6.5.0 decompile "$PWD/ledger-x86_64-O1.o" total --provider ghidra --format json
```

各调用约十秒。subject.local_path 记录 `manuals/reverse-engineering-101/capture/fixtures/` 下同 SHA-256 副本的路径。

ghidra/ledger-x86_64-O1.ghidra.c 原样保存三段 raw_result.value。

ghidra/ledger-x86_64-O1.ghidra-repaired.c 只做可编译所需最小修改：

1. 添加 `typedef unsigned int uint;`、`typedef unsigned long ulong;`，因为 Ghidra 输出自有类型名。
2. DAT_001000b4 定义为目标 .rodata 偏移 0x14 的二十字节，使 `&DAT_001000b4 + (ulong)uVar2 * 4` 保持 Ghidra 的字节运算语义。其临时项目将 .rodata 放在 0x001000a0，所以 0x001000b4 就是 .rodata + 0x14。
3. percent_change 的 undefined1 [16] 返回改为 int，删除第三参数 param_3，将两个十六字节 auVar 临时值改为商低八字节再截断为 int。grade、total 不变。

test_lifted_functions_behave_like_the_source_on_an_input_grid 将本文件、ledger.c、提升器输出分别编译，在相同输入上比较三者。
