# 第 33 课夹具

所有目标均由原始课程机器使用旁边的源码编译，没有下载二进制。

| 文件 | 构建方式 | 用途 |
|---|---|---|
| `ledger.c` | 与 `manuals/reverse-engineering-101/capture/fixtures/ledger.c` 共用源码 | 四个函数： `percent_change`, `grade`, `total`, `grade_label` |
| `ledger-x86_64-O0.o` | `clang -target x86_64-unknown-linux-gnu -O0 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O0.o` | grade 有真正跳转表：jmpq *%rax 配五项 .rela.rodata |
| `ledger-x86_64-O1.o` | `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O1.o` | grade 变成值表加载，total 是标量循环 |
| `ledger-x86_64-O2.o` | `clang -target x86_64-unknown-linux-gnu -O2 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O2.o` | total 用 SSE2 向量化，有两个循环 |
| `sweep-trap.s` | 手写 | .text 内字节表，线性扫描会误解码为代码 |
| `sweep-trap.o` | `clang -target x86_64-unknown-linux-gnu -c sweep-trap.s -o sweep-trap.o` | 构建后的陷阱 |
| `*.objdump.txt` | `/Library/Developer/CommandLineTools/usr/bin/llvm-objdump -d FILE.o` (Apple LLVM 17.0.0) | 解码器测试的对照基准 |

编译器为 Apple clang 17.0.0（clang-1700.6.3.2）。三个 ledger 目标与 `manuals/reverse-engineering-101/capture/fixtures/` 的捕获夹具逐字节相同。
