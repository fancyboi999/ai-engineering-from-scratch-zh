# 第 38 课夹具

所有目标均由原始课程机器按 build_fixtures.sh 从 convention.c 编译，没有下载。编译器为 Apple clang 17.0.0（clang-1700.6.3.2），列表来自 Command Line Tools 的 Apple LLVM 17.0.0 llvm-objdump、llvm-dwarfdump。版本见 toolchain-versions.txt，摘要见 SHA256SUMS.txt。

convention.c 自行声明 memcpy、strncpy，仅包含 stdarg.h、stddef.h，因为未安装 Linux/Windows sysroot，交叉目标只能解析 clang 自有头。结构使用 long long，因为 MSVC 的 long 四字节，其他目标八字节。

| 文件 | 构建方式 | 用途 |
|---|---|---|
| `convention-x86_64-linux-O0.o`, `-O2.o` | `clang -target x86_64-unknown-linux-gnu -O0/-O2 -fno-asynchronous-unwind-tables -c convention.c` | System V AMD64 psABI |
| `convention-x86_64-windows-O0.o`, `-O2.o` | `clang -target x86_64-pc-windows-msvc -O0/-O2 -fno-asynchronous-unwind-tables -c convention.c` | Microsoft x64 |
| `convention-aarch64-linux-O0.o`, `-O2.o` | `clang -target aarch64-unknown-linux-gnu -O0/-O2 -fno-asynchronous-unwind-tables -c convention.c` | AAPCS64 |
| `convention-arm64-macos-O2.o` | `clang -target arm64-apple-macos -O2 -fno-asynchronous-unwind-tables -c convention.c` | Apple arm64 差异（可变参数槽、帧记录位置） |
| `convention-x86_64-windows-O2-seh.o` | 同 Windows -O2，但去掉 -fno-asynchronous-unwind-tables | `.pdata` 与 `.xdata` 展开表 (`.sections.txt`, `.xdata.txt`, `.relocs.txt`) |
| `convention-x86_64-linux-O2-eh.o`, `convention-aarch64-linux-O2-eh.o` | 同 Linux -O2，但去掉 -fno-asynchronous-unwind-tables | `.eh_frame` 调用帧信息 (`.eh-frame.txt` 来自 `llvm-dwarfdump --eh-frame`) |
| `convention-x86_64-linux-O0-noredzone.o` | Linux `-O0`，加 `-mno-red-zone` | 不用红区的叶函数帧 |
| `convention-x86_64-linux-O2-fp.o` | Linux `-O2`，加 `-fno-omit-frame-pointer` | -O2 保留帧指针 |
| `*.objdump.txt` | `llvm-objdump -d -r FILE.o` | 分析器读取的列表 |
| `*.symbols.txt` | `llvm-objdump -t FILE.o` | 参考符号表 |

tools/ 保存 capture_tools.sh 于 2026-10-14 捕获的 radare2 6.2.4（afcl、afc、afi、afv、afs、afcr）、rizin 0.9.1（afcl、afc、afi、afvl、afcr）、angr 10.0.3（angr_cc.py 先 CFGFast，再 CompleteCallingConventions，打印恢复的约定类和原型）。课程代码只读捕获，无需安装工具。
