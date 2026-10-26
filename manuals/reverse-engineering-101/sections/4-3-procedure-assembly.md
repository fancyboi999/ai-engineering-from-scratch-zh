# procedure_assembly

> procedure_assembly 将一个函数的 Ghidra Listing 文本作为字符串返回，每行一条指令，地址在前，不含字节。

你想从处理器视角看 `grade` 中的除以十。C 源码写 `score / 10`，arm64 代码却完全没有除法指令。理解原因，是汇编教你的第一件事。

读完本节，你能读懂 `_grade` 的 15 条指令，将它们分为三个块，并解释乘以 `0x66666667` 的含义。

## 调用与文本

```listing
title: _grade 的 procedure_assembly
source: capture/out/10-mcp-06-procedure-assembly-grade.json
lang: json
note: 请求参数和结果开头。结果是含换行的单个字符串，在第二行后截断。
---
"name": "procedure_assembly",
"arguments": {
  "procedure": "_grade"
}
…
"normalized_result": "0x100000518: mov w8, #0x6667\n0x10000051c: movk w8, #0x6666, LSL #16\n…
```

桥接层解析过程，不限条数扫描指令，将每条渲染为文本，并附加所有不返回调用警告。记录带有限制说明："Assembly is Ghidra Listing text and does not claim textual equivalence with Hopper output."。文本由 Ghidra 渲染，寄存器名、立即数和间距遵循 Ghidra，而非 clang 或 `llvm-objdump`。

[第 4.6 节](#s-analyze-function-and-pseudocode)的档案将相同行保存为数组，更容易阅读。

```listing
title: _grade 的十五条指令
source: capture/out/06-function-grade.json
lang: json
note: 档案的完整 assembly 数组。
---
"assembly": [
  "0x100000518: mov w8, #0x6667",
  "0x10000051c: movk w8, #0x6666, LSL #16",
  "0x100000520: smull x8, w0, w8",
  "0x100000524: lsr x9, x8, #0x3f",
  "0x100000528: asr x8, x8, #0x22",
  "0x10000052c: add w8, w8, w9",
  "0x100000530: sub w8, w8, #0x6",
  "0x100000534: cmp w8, #0x4",
  "0x100000538: b.hi 0x10000054c",
  "0x10000053c: adrp x9, 0x100000000",
  "0x100000540: add x9, x9, #0x7d0",
  "0x100000544: ldr w0, [x9, w8, UXTW #0x2]",
  "0x100000548: ret",
  "0x10000054c: mov w0, #0x0",
  "0x100000550: ret"
],
```

## 阅读十五条指令

参数 `score` 经 `x0` 的低 32 位 `w0` 传入，结果也从 `w0` 传出。将文本分四组读。

前两行构建常量。`mov w8, #0x6667` 设置低半部，`movk w8, #0x6666, LSL #16` 插入高半部，因此 `w8` 为 `0x66666667`。

接下来四行不用除法完成除以十。`smull x8, w0, w8` 将两个 32 位值相乘，得到 64 位积。`asr x8, x8, #0x22` 右移 34 位，`lsr x9, x8, #0x3f` 取符号位。`add w8, w8, w9` 加上符号位，修正负 score 的舍入，得到按 C 语义截断的 `score / 10`。[第 34 课](phases/13-tools-and-protocols/34-lifting-to-pseudocode)证明，对每个 32 位 `int`，`0x66666667` 和右移 34 位都给出这个商。

接下来三行是 switch。`sub w8, w8, #0x6` 将 case 6 到 10 转为索引 0 到 4。`cmp w8, #0x4` 和 `b.hi 0x10000054c` 将大于 4 的索引送到默认分支。比较是无符号的，因此产生负索引的负 score 也走默认分支。一条指令同时处理了 `default` 标签和小于 6 的 case。

最后六行是两处返回。`adrp x9, 0x100000000` 和 `add x9, x9, #0x7d0` 构成地址 `0x1000007d0`，即[第 3.2 节](#s-inspect-binary-layout-and-the-load-image)的 `__TEXT,__const` 起点。`ldr w0, [x9, w8, UXTW #0x2]` 从该地址加四倍索引处加载 32 位字。文件偏移 2000 的 20 字节按小端字读取为 `1, 2, 3, 4, 4`，因此加载结果就是等级。默认路径为 `mov w0, #0x0` 和 `ret`。

```figure
id: fig-4-4
kind: state
title: _grade 的三个基本块
claim: Ghidra 的 basic_blocks 在唯一条件分支处切分十五条指令，两个叶块均以 ret 结束，没有后继。
caption: 从顶部块开始读。箭头是首块的两个后继，每个叶块的 successors 列表为空。依据 capture/out/06-function-grade.json。
```

**基本块：** 顶部只有一个入口、底部只有一个出口的指令序列。控制只能从第一条进入，在最后一条之后离开。档案的 `basic_blocks` 为 `_grade` 列出三个块：`0x100000518` 到 `0x10000053c`，后继为 `0x10000053c` 和 `0x10000054c`；另两个叶块没有后继。[第 33 课](phases/13-tools-and-protocols/33-disassembly-and-control-flow)从字节构建解码器和基本块切分器，得到相同划分。

## x86-64 上的同一函数

```listing
title: x86-64 对象中的 grade
source: capture/out/06-function-grade-x86_64-O1.json
lang: json
note: x86-64 档案的完整 assembly 数组。Ghidra 以 Intel 语法和大写助记符显示 x86。
---
"assembly": [
  "0x100010: MOVSXD RAX, EDI",
  "0x100013: IMUL RAX, RAX, 0x66666667",
  "0x10001a: MOV RCX, RAX",
  "0x10001d: SAR RCX, 0x22",
  "0x100021: SHR RAX, 0x3f",
  "0x100025: ADD ECX, EAX",
  "0x100027: ADD ECX, -0x6",
  "0x10002a: XOR EAX, EAX",
  "0x10002c: CMP ECX, 0x4",
  "0x10002f: JA 0x0010003d",
  "0x100031: MOV EAX, ECX",
  "0x100033: LEA RCX, [0x1000b4]",
  "0x10003a: MOV EAX, dword ptr [RCX + RAX*0x4]",
  "0x10003d: RET"
],
```

十四条指令，形状相同。乘法只有一条 `IMUL RAX, RAX, 0x66666667`，两次移位仍是 34 和 63。`XOR EAX, EAX` 在比较前将默认返回值设为零，因此默认路径无需额外块，函数只有一个 `RET`。表位于 `0x1000b4`，即 `.rodata` 加 `0x14`。清单将该地址显示为普通数值，因为 Ghidra 加载对象时应用了重定位。[第 4.6 节](#s-analyze-function-and-pseudocode)会回到 `XOR`，因为反编译器的写法隐藏了这个零。

## 不返回警告放在哪里

`_grade` 的 `raw_result.limitations` 为空。函数调用被 Ghidra 标为不返回的目标时，扫描可能在此停止，这个列表会给出调用点。在 macOS 与 Linux 上，rea 导入后运行修复脚本，清除六个常见库名称的错误不返回标志，因此这里读取的是修复后的函数体。Ghidra 文档说明，若不清除这个推断标志，函数体可能在后续字节之前就被截断 {{ghidra §Admitted function-analysis semantics}}。

```takeaways
- 分组读汇编：常量、算术、比较与分支、返回。
- 减法之后的无符号比较可视为也拒绝负数的边界检查。
- 找出一对 `adrp` 与 `add` 指向的表，再按文件偏移读取字节。
- 相信函数体大小前，先检查 `raw_result.limitations` 是否有终止调用。
```

Sources: capture/out/10-mcp-06-procedure-assembly-grade.json, capture/out/06-function-grade.json, capture/out/06-function-grade-x86_64-O1.json, capture/out/04-inspect-macho.json, capture/fixtures/ledger-arm64-O1, capture/fixtures/ledger.c; rea 6.7.0 at 27dc42d: bridge/ghidra/ReaGhidraBridge.java, src/ghidra/GhidraProviderCapabilities.ts; rea docs/ghidra-provider.md
