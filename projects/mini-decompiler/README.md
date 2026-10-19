# 迷你反编译器

支持明确限定的 x86-64 子集。读取你编译的 ELF 可重定位目标文件，将每个函数转换为结构化 C，再验证输出：重编译 C，比较屏蔽重定位字段后的字节，在输入网格上并行运行原版与反编译版本，生成列出全部未知项的证据报告。

核心仅使用 Python 标准库。clang 可选，用于阶段 8 的重编译与差分验证。评分器只检查你选择的工作区，不会从参考实现中补齐缺失行为。

只分析你从源代码自行编译的程序。测试固件是为本项目编写的小型 C 函数。

## 构建并运行你的实现

在仓库根目录执行一次初始化。初始模板在阶段 1 失败是预期行为。

```bash
python3 scripts/project_test.py mini-decompiler --init learning-artifacts/mini-decompiler
python3 scripts/project_test.py mini-decompiler --stage 1 --path learning-artifacts/mini-decompiler --strict
```

实现各阶段后，运行累计评分器及预置命令行：

```bash
python3 scripts/project_test.py mini-decompiler --all --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec decompile samples/samples-x86_64-O1.o
python3 -m minidec verify samples/samples-x86_64-O1.o --source samples/samples.c --opt O1 --out verify-O1
```

命令行、IR 打印器、C 打印器和测试驱动生成器属于预置脚手架。每个阶段的模板添加该阶段的模块，明确给出签名与契约，且从不覆盖早期阶段的文件。

## 检查自己的目标文件

使用测试固件的编译选项编译 C 文件，然后反编译并验证：

```bash
clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c mine.c -o mine.o
python3 -m minidec disasm mine.o
python3 -m minidec cfg mine.o my_function
python3 -m minidec decompile mine.o --json --out mine-decompiled.c
python3 -m minidec verify mine.o --source mine.c --opt O1 --out verify-mine
```

`verify` 将 `decompiled.c`、`recompiled.o`、`report.json` 及差分测试程序写入输出目录。状态为 `pass` 或 `behaviour-only` 时退出码为 0，为 `fail` 或 `unknown` 时为 1，因此 CI 可以据此阻断。遇到超出子集的函数会报错，指出地址与字节。

## 单独检查参考实现

在仓库根目录运行：

```bash
python3 scripts/project_test.py mini-decompiler --all --solution --strict
cd projects/mini-decompiler/solution
python3 -m minidec decompile ../fixtures/samples-x86_64-O1.o
python3 -m minidec verify ../fixtures/samples-x86_64-O1.o --source ../fixtures/samples.c --opt O1 --out verify-O1
```

## 观察结果

在 `-O1` 下，五个测试固件函数全部通过行为网格，共 183 个单元。其中四个重新编译后也具有相同的掩码字节。`fold` 重编译后多出 2 字节，因此汇总状态为 `behaviour-only`；报告说明了哪个验证分支不匹配以及原因。`tenths_and_fifths` 的两种除法惯用法折叠为 `param_1 / 10 + param_1 / 5`，`band` 的值表恢复为 `lookup_0[6] = {5, 8, 12, 20, 20, 35}`。

## 子集及其限制

输入是 clang 面向 `x86_64-unknown-linux-gnu` 生成的小端 x86-64 ELF64 可重定位目标文件（`ET_REL`）。解码器覆盖阶段 2 列出的整数指令。函数签名遵循 System V psABI，最多六个 INTEGER 参数。不支持浮点、栈上传参、结构体返回或通过指针表调用。

行为验证通过仅覆盖实际运行主机上的声明网格，不能证明所有输入等价。行为验证分支会将原始源代码编译为宿主机程序。字节验证通过仅对应某个编译器版本与一组选项。

## 测试固件

- 演示固件：含五个函数的 C 文件、`-O0` 和 `-O1` 目标文件，以及捕获的反汇编清单。模板将其复制到 `samples`。
- 留出固件：另四个函数及其目标文件和清单。示例不使用它们，但每个阶段都会测试。
- 字节验证的两个近似候选目标文件：一个更改表值，另一个使用更宽的累加器。

## 阶段

1. [读取 ELF 可重定位目标文件](stages/01-elf-loader/docs/zh.md)
2. [解码 x86-64 子集](stages/02-decoder/docs/zh.md)
3. [恢复控制流](stages/03-control-flow/docs/zh.md)
4. [提升到 IR 并构建 SSA](stages/04-lift-and-ssa/docs/zh.md)
5. [化简并折叠惯用法](stages/05-optimize/docs/zh.md)
6. [恢复签名与类型](stages/06-signature/docs/zh.md)
7. [结构化控制流图并生成 C](stages/07-structure-and-emit/docs/zh.md)
8. [验证输出](stages/08-verify/docs/zh.md)

## 相关课程

- [反汇编与控制流](../../phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md)
- [提升到伪代码](../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md)
- [重建并验证等价](../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/docs/zh.md)
- [调用约定与栈帧](../../phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/zh.md)
- [编译器惯用法与优化](../../phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/docs/zh.md)

## 主要参考资料

- [ELF-64 Object File Format, version 1.5](https://uclibc.org/docs/elf-64-gen.pdf)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 2](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- Cooper, Harvey and Kennedy, [A Simple, Fast Dominance Algorithm](https://www.cs.tufts.edu/comp/150FP/archive/keith-cooper/dom14.pdf)
- Cytron, Ferrante, Rosen, Wegman and Zadeck, Efficiently Computing Static Single Assignment Form and the Control Dependence Graph, ACM TOPLAS 13(4), 1991
- Granlund and Montgomery, Division by Invariant Integers using Multiplication, PLDI 1994
- Cifuentes, Reverse Compilation Techniques, PhD thesis, Queensland University of Technology, 1994
