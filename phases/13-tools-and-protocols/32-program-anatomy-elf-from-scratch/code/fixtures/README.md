# 第 32 课夹具

这里每个文件都是自建程序。`ledger.c` 是逆向路线共用夹具，与 `manuals/reverse-engineering-101/capture/fixtures/ledger.c` 相同。原始目标由 macOS 26.2、Apple clang 17.0.0（clang-1700.6.3.2）、SDK 26.2 构建。`build_fixtures.sh` 执行下方全部命令。

| 文件 | 精确构建命令 |
|---|---|
| `ledger-x86_64-O0.o` | `clang -target x86_64-unknown-linux-gnu -O0 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O0.o` |
| `ledger-x86_64-O1.o` | `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O1.o` |
| `ledger-x86_64-O2.o` | `clang -target x86_64-unknown-linux-gnu -O2 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O2.o` |
| `ledger-arm64-O1.o` | `clang -target arm64-apple-macos -O1 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-arm64-O1.o` |
| `tiny-x86_64` | `python3 build_tiny_elf.py` |

三个 x86-64 目标不需要 Linux sysroot，因为 ledger.c 不包含头文件。arm64 目标的 LC_BUILD_VERSION 记录 SDK 版本，换 SDK 会生成不同字节。测试读取提交的夹具字节，不在测试期间重建。

对照基准文本，捕获工具为 `/Library/Developer/CommandLineTools/usr/bin/llvm-objdump` (Apple LLVM version 17.0.0):

| 文件 | 捕获命令 |
|---|---|
| `ledger-x86_64-O0.objdump.txt` | `llvm-objdump -h -t -r ledger-x86_64-O0.o` |
| `ledger-x86_64-O1.objdump.txt` | `llvm-objdump -h -t -r ledger-x86_64-O1.o` |
| `ledger-x86_64-O2.objdump.txt` | `llvm-objdump -h -t -r ledger-x86_64-O2.o` |
| `ledger-arm64-O1.objdump.txt` | `llvm-objdump -h -t -r ledger-arm64-O1.o` |
| `ledger-arm64-O1.load-commands.txt` | `llvm-objdump --macho --private-headers ledger-arm64-O1.o` |
| `tiny-x86_64.objdump.txt` | `llvm-objdump -h -t -r -p tiny-x86_64` |

目标文件 SHA-256：

```text
b2046c121930d3d1e5ba84ba796f9e9e161df2fe76f7b9dcf8db63f690447e13  ledger-x86_64-O0.o
9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f  ledger-x86_64-O1.o
ce31eaf10e7cb88fb8e313abfdb4f743964646339260c471ff97d60137bbe89b  ledger-x86_64-O2.o
fe67e3783e24427e4c3264e0e6ff9060f685cdd0939def1cdd99dad66e21c900  ledger-arm64-O1.o
```
