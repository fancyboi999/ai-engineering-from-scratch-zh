# 第 37 课夹具

所有目标由原始课程机器从旁边源码编译，工具输出也由这些目标捕获，没有下载。目标与第 33 课夹具逐字节相同。

## 程序

| 文件 | 构建方式 | 用途 |
|---|---|---|
| `ledger.c` | 与第 33 课共用源码 | 四个函数： `percent_change`, `grade`, `total`, `grade_label` |
| `ledger-x86_64-O0.o` | `clang -target x86_64-unknown-linux-gnu -O0 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O0.o` | grade 含各工具解析结果不同的跳转表 |
| `ledger-x86_64-O1.o` | 相同命令，改用 -O1 | 一致案例：各工具均得 3、3、5、4 块 |
| `ledger-x86_64-O2.o` | 相同命令，改用 -O2 | total 向量化，各工具均十块 |
| `sweep-trap.s` | 手写 | .text 内四数据字节 |
| `sweep-trap.o` | `clang -target x86_64-unknown-linux-gnu -c sweep-trap.s -o sweep-trap.o` | 线性扫描将数据解码为代码 |

编译器： Apple clang version 17.0.0 (clang-1700.6.3.2). 精确命令见 build_fixtures.sh。

## 捕获

capture_tools.py 各运行工具一次，将日期、主机、版本和各文件精确命令写入 captures.json。课程代码和测试只读取这些文件，从不启动工具。

| 工具 | 版本 | 文件 | 命令 |
|---|---|---|---|
| llvm-objdump | Apple LLVM version 17.0.0 | `*.objdump.txt` | `llvm-objdump -d -r FILE.o` |
| radare2 | 6.2.4 | `*.radare2.json` | `r2 -e scr.color=0 -qc 'iSj' FILE.o`, then `aaa; aflj`, and per function `aaa; afbj @ ADDR`, `aaa; pdfj @ ADDR`, `aaa; pdc @ ADDR` |
| rizin | 0.9.1 | `*.rizin.json` | `rizin -e scr.color=0 -qc '<same commands without pdc>' FILE.o` |
| angr | 10.0.3 (pyvex 10.0.3, cle 10.0.3) | `*.angr.json` | `python capture_angr.py FILE.o OUT.json`: `CFGFast(normalize=True, data_references=True)` and `Decompiler` on every symbol function |
| Ghidra | 12.1.4 | `*.ghidra.json` | `analyzeHeadless PROJECT_DIR lesson37 -import FILE.o -scriptPath . -postScript ExportAnalysis.java OUT.json -deleteProject` |
| pyvex, pypcode, radare2, rizin | 10.0.3, 4.0.1, 6.2.4, 0.9.1 | `ir-lifts.json` | `python capture_ir.py`, then `r2 -a x86 -b 64 -qc 'e asm.esil=true; wx HEX; pd 1' -` and `rizin -a x86 -b 64 -qc 'wx HEX; aoi 1' malloc://16` |

JSON 保留工具原始地址，各自 .text 基址不同：llvm-objdump 输出节偏移，radare2/rizin 为 0x08000040，angr 为 0x400000，Ghidra 为 0x100000。课程代码减去各基址。

ExportAnalysis.java 列出 Ghidra 各函数体内指令、带流类型的 BasicBlockModel 基本块、每指令原始 P-code、反编译 C、数据引用，不列函数体外指令。

Ghidra 需 JDK 21。沙箱禁止默认 Java 临时目录时，设置 `JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=$TMPDIR`。

未运行 IDA Pro、Binary Ninja，课文仅根据文档描述。
