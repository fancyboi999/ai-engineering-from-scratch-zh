# 超越原生代码：Python、JVM、.NET 与 WebAssembly 字节码

> 字节码文件包含程序，也包含编译器为它留下的注释。本课构建读取器，查明每种容器保留了哪些注释。

**类型：** Build
**语言：** Python、Java、C#、WebAssembly 文本格式
**前置要求：** 阶段 13 · 第 32 课（从零构建 ELF 读取器）、第 33 课（反汇编与控制流）
**预计时间：** 约 150 分钟

## 学习目标

- 按照 PEP 552 读取四个解释器版本生成的 `.pyc` 文件的 16 字节头部，不依赖 `marshal` 模块反序列化代码对象。
- 按照 JVMS 第 4 章解析 JVM class 文件：常量池、字段、方法、`Code` 属性，以及 `javac -g` 添加的表。
- 反汇编 `Ledger.class` 中的 JVM 操作码，对同一份源码的四种构建结果与 `javap -c` 逐项核验。
- 逐节读取 WebAssembly 模块，解码所有函数体，并与 `wasm-objdump -d` 核验结果。
- 从 PE 数据目录出发，遍历 .NET 程序集的 ECMA-335 元数据，找到 `MethodDef` 行和每个方法的 CIL，并与 ILSpy 使用的读取库核对。
- 对五种容器中的同一个函数，测量每种格式保留与丢失的名称、类型和控制结构。

## 问题背景

你构建了 `ledger.py`，在 `__pycache__` 中发现 `ledger.cpython-314.pyc`。你问 agent 文件里有什么。agent 运行了反编译器。工具输出 `Unsupported opcode`，还有一行 `# WARNING: Decompyle incomplete`。agent 因此认定文件经过了混淆。

文件没有混淆。前两个字节是 `2b 0e`，按小端序解释为数值 3627。这正是 CPython 3.14 写入的值，而反编译器的操作码表只支持到 3.13。工具过时了。agent 没有读取头部，因此无法区分这两种情况。

第 33 课展示了原生代码会丢失什么：参数名、类型，以及变成跳转表的 `switch`。字节码容器丢失的信息更少，而且各不相同。pyc 保留所有变量名，却没有类型。class 文件保留类型，但只有明确要求时才保留局部变量名。Wasm 模块保留控制结构，名称则需要自定义节携带。.NET 程序集把参数名保存在表里，把局部变量名留给另一个文件。不先弄清容器原本包含哪些注释，就无法评价任何一种格式的反编译结果。

本课用 Python 标准库构建四个读取器。每个读取器从第一个字节开始解析容器，列出一个函数，并在你构建的夹具上与该格式自己的工具核对。最后一节把五种容器中的 `ledger` 的 `grade` 并排比较。

```figure
re-43-five-containers
```

## pyc 头部由四个字组成

PEP 552 将头部定义为四个 32 位字。第一个是魔数。第二个是位域。位 0 为 1 表示文件基于哈希。位 1 为 1 表示 `check_source`：解释器在导入时计算源码哈希并进行比较。位 0 为 0 时，第三和第四个字分别是源码 mtime 和源码大小。位 0 为 1 时，它们保存源码的 64 位 SipHash。

魔数位于 `Include/internal/pycore_magic_number.h`。从 3.11 起，规则是 Python 3.n 从 2900 + 50n 开始，每个发布周期内每次字节码变更都加一。存储形式是 16 位数值后跟 `\r\n`，所以用文本模式打开 pyc 会读出错误魔数。最终值分别是：3.11 为 3495，3.12 为 3531，3.13 为 3571，3.14 为 3627，3.15 为 3666。Python 3.15.0 于 2026-10-09 发布，构建这些夹具的机器没有安装它，因此这里的值来自头文件，而非本课的实际文件。

夹具为每个解释器保留两个 pyc 文件。`compile_pyc.py` 使用 `py_compile.compile(..., dfile="ledger.py")` 写入文件，所以记录的文件名是 `ledger.py`，而不是构建机器上的路径。3.14 文件的前 16 个字节如下：

```text
checked-hash   2b 0e 0d 0a  03 00 00 00  c7 16 c7 fc c5 1d 81 01
timestamp      2b 0e 0d 0a  00 00 00 00  8d 60 cf 6a  f1 01 00 00
```

逐字读取时间戳头部。`03 00 00 00` 或 `00 00 00 00` 是标志字。`8d 60 cf 6a` 是 0x6acf608d = 1791975565，即构建文件时 `ledger.py` 的 mtime。`f1 01 00 00` 是 497，即源码大小。checked-hash 文件则携带标志 3 和八个哈希字节。四个解释器的头部除魔数字外都一致：

| 解释器 | 魔数字节 | 数值 | 文件字节数 | `grade.co_code` 字节数 | `grade` 指令数 |
|---|---|---|---|---|---|
| 3.11.14 | `a7 0d 0d 0a` | 3495 | 1054 | 80 | 31 |
| 3.12.12 | `cb 0d 0d 0a` | 3531 | 937 | 62 | 26 |
| 3.13.12 | `f3 0d 0d 0a` | 3571 | 943 | 70 | 26 |
| 3.14.6 | `2b 0e 0d 0a` | 3627 | 965 | 96 | 35 |

`code/main.py` 中的 `read_pyc_header()` 返回这些字段，并从数值识别版本。`importlib.util.MAGIC_NUMBER` 为当前解释器提供相同的四个字节。`python3 code/main.py compare` 使用 `PATH` 中能找到的每个 `python3.11` 到 `python3.15` 编译源码，并将读取器看到的头部与各解释器报告的自身信息并排输出。

## Marshal 逐字段写入代码对象

每个夹具的第 16 字节都是 `e3`，即 `0x80 | ord('c')`：设置了 `FLAG_REF` 的代码对象的 marshal 类型码。它告诉读取器记住这个对象，供后续 `r` 引用使用。marshal 文档说明，格式刻意不公开，而且代码对象不跨版本兼容。这两点都是真的，但格式仍然足够小，可以直接读取。`Python/marshal.c` 列出了类型码：`N` 是 None，`i` 是 32 位 int，`s` 是 bytes，`z` 和 `Z` 是短 ASCII 字符串，`(` 和 `)` 是元组，`c` 是代码对象，`r` 是反向引用。容器先为自己保留引用槽位，再处理子对象，读取器也必须如此。

`w_complex_object()` 按固定顺序写入代码对象。在 3.11 到 3.15 中，先以 32 位整数写入 `argcount`、`posonlyargcount`、`kwonlyargcount`、`stacksize`、`flags`，再以对象写入 `code`、`consts`、`names`、`localsplusnames`、`localspluskinds`、`filename`、`name`、`qualname`，然后是 `firstlineno`，最后是 `linetable` 和 `exceptiontable`。从第 17 字节开始，手动解码 3.14 文件的模块代码对象：

```text
00 00 00 00   argcount 0
00 00 00 00   posonlyargcount 0
00 00 00 00   kwonlyargcount 0
01 00 00 00   stacksize 1
00 00 00 00   flags 0
f3 22 00 00 00   type 's' with FLAG_REF, 34 bytes of co_code follow
80 00  52 06  74 00  52 01  17 00  74 01 ...
```

代码中每条指令占两个字节：`80 00` 是 `RESUME 0`，`52 06` 是 `LOAD_CONST 6`，`74 00` 是 `STORE_NAME 0`，`17 00` 是 `MAKE_FUNCTION`。夹具中的 3.14 清单输出同样的五条模块级语句。`code` 之后是常量，其中保存四个嵌套代码对象；再往后是 `names`：`('LABELS', 'percent_change', 'grade', 'total', 'grade_label')`。

`code/main.py` 的 `Unmarshaller` 读取这种布局，也读取 3.9 和 3.10 的旧布局，后者将 `nlocals`、`varnames`、`freevars` 和 `cellvars` 存为独立字段。它构建的 `CodeObject` 与真实对象使用相同属性名。`varnames` 根据 `localspluskinds` 的 `CO_FAST_LOCAL` 位筛选 `localsplusnames`。对四个文件中的 `grade`，它都返回 `('score', 'bucket')`、值为 10 的 `firstlineno`，以及非空的 `linetable`。测试 `test_unmarshaller_agrees_with_the_running_interpreter` 用当前解释器写出的文件，将每个字段与 `marshal.loads()` 比较。其余三个文件可以由本课代码读取，但当前解释器的 `marshal` 无法读取。

## 四个解释器，四种 grade 字节码

dis 文档的每个版本都有一条警告：字节码是 CPython 的实现细节，不保证保持不变。夹具用十一行 Python 展示这句话的含义。每个解释器的 `python3.1N -m dis ledger.py` 输出都已采集。

3.11 中的 `grade` 开头如下：

```text
 11           2 LOAD_FAST                0 (score)
              4 LOAD_CONST               1 (10)
              6 BINARY_OP                2 (//)
             10 STORE_FAST               1 (bucket)
 12          12 LOAD_FAST                1 (bucket)
             14 LOAD_CONST               2 (9)
             16 COMPARE_OP               5 (>=)
             22 POP_JUMP_FORWARD_IF_FALSE     2 (to 28)
```

`BINARY_OP` 位于偏移 6，下一条指令位于 10。中间两个字节是 PEP 659 特化自适应解释器的内联缓存项。偏移 16 的 `COMPARE_OP` 后面是 22，因此它有两个缓存项。不传 `show_caches=True` 时，缓存会隐藏。3.12 用 `RETURN_CONST` 替代 `LOAD_CONST` 加 `RETURN_VALUE`，将跳转改名为 `POP_JUMP_IF_FALSE`，并把 `grade` 从 80 字节缩为 62 字节。3.13 输出标签 `L1` 到 `L4` 而不是偏移，并在 CLI 增加显示缓存的 `-C` 和显示偏移的 `-O`。3.14 又移除了 `RETURN_CONST`，加入 `LOAD_SMALL_INT` 和 `LOAD_FAST_BORROW`，并在每个条件跳转后插入 `NOT_TAKEN`：

```text
 12         20       LOAD_FAST_BORROW         1 (bucket)
            22       LOAD_SMALL_INT           9
            24       COMPARE_OP             188 (bool(>=))
            26       CACHE                    0 (counter: 0)
            28       POP_JUMP_IF_FALSE        3 (to L1)
            30       CACHE                    0 (counter: 0)
            32       NOT_TAKEN
```

`-C -O` 清单显示 `grade` 中有 13 个 `CACHE` 项：`BINARY_OP` 后五个，每个 `COMPARE_OP` 和每个 `POP_JUMP_IF_FALSE` 后各一个。自适应夹具展示了缓存的用途。调用 200 次后，`dis.dis(grade, adaptive=True)` 在普通清单的 `RESUME` 和 `COMPARE_OP` 位置输出 `RESUME_CHECK` 和 `COMPARE_OP_INT`；`total` 则出现 `FOR_ITER_LIST`、`BINARY_OP_ADD_INT` 和 `JUMP_BACKWARD_NO_JIT`。特化形式使用同一批 `co_code` 字节。pyc 永远不包含它们，因为特化发生在内存中。

这就是反编译器有版本上限的原因。uncompyle6 3.9.3 声称支持 Python 1.0 到 3.8 的字节码。decompyle3 3.9.3 读取 3.7 和 3.8。两者背后的跨版本反汇编器 xdis 6.3.0 支持到 3.13。pycdc 的构建文件中，操作码表只到 `python_3_13.cpp`；遇到未知操作码时，它输出 `Unsupported opcode` 并将结果标记为不完整。PyLingual 声称支持 3.6 以来的所有已发布版本，并用 3.8 到 3.15 的解释器重新编译、检查自己的输出。对 3.14 文件，前三个会拒绝或失败，只有最后两个适用。选择工具前先读魔数字。

## class 文件保留了描述自身的字典

JVMS Java SE 25 第 4.1 节将布局列为一个结构：`magic`、`minor_version`、`major_version`、`constant_pool_count`、常量池、`access_flags`、`this_class`、`super_class`、接口、字段、方法、属性。魔数是 `0xCAFEBABE`。Java SE 25 虚拟机接受 45 到 69 的主版本号，次版本 65535 表示预览特性文件。`Ledger-g.class` 的前十个字节是 `ca fe ba be 00 00 00 41 00 5e`：主版本 65 表示 Java 21，`0x5e` = 94 是常量池计数。同一份源码由 javac 25.0.2 构建的 `Ledger-jdk25.class` 以 `ca fe ba be 00 00 00 45` 开头：主版本 69。

常量池是 class 文件保存自身字典的地方。`-g` 构建中的条目 `#13` 是一个 `Methodref`，指向类 `#8` 和名称与类型 `#14`。沿索引查找得到 `Ledger.grade:(I)I`，正是 `javap -v` 在 `//` 后输出的内容。描述符 `(I)I` 表示一个 `int` 参数和 `int` 返回值。`total` 的 `([I)I` 表示参数是 `int` 数组。代码接触的每个方法、字段和类都有这样的条目；第 4.10 节的校验器会拒绝指令与条目不一致的文件。`code/main.py` 的 `ClassFile` 类读取表 4.4 的全部 17 种常量标签，把 `Long` 或 `Double` 计为两个槽位。遇到未知标签或最后一个属性后的额外字节时，它会报错。

类、各字段、各方法以及 `Code` 属性本身都可以附带属性。JVMS 要求虚拟机忽略不认识的属性，因此增删调试表不需要改变方法体。javac 手册说明，`-g` 生成包括局部变量在内的全部调试信息；默认只生成行号与源文件信息；`-g:none` 则什么也不生成。三种构建结果验证了这一点：

| 构建 | 字节数 | 常量池计数 | `LineNumberTable` | `LocalVariableTable` | `SourceFile` | `grade` 代码字节数 |
|---|---|---|---|---|---|---|
| `javac -g` | 1832 | 94 | 7 个方法 | 6 个方法 | 有 | 50 |
| `javac` | 1581 | 82 | 7 个方法 | 无 | 有 | 50 |
| `javac -g:none` | 1404 | 79 | 无 | 无 | 无 | 50 |

三个文件中 `grade` 的 50 个代码字节完全相同，测试也验证了这一点。`-g` 为 `grade` 增加了一行 `LocalVariableTable`：起点 0，长度 50，槽位 0，名称 `score`，描述符 `I`。没有它时，反编译器只看到类型为 `int` 的槽位 0，必须自行命名。每种构建都保留 `StackMapTable`，因为校验器需要它；也保留 `BootstrapMethods` 属性，因为 `main` 通过 `invokedynamic` 拼接字符串。

## 手动解码 tableswitch

JVMS 第 6 章将每条指令定义为一个操作码字节和它指定的操作数。分支偏移是相对于分支操作码地址的 16 位有符号值；这与 x86-64 不同，后者的位移相对于下一条指令。`tableswitch` 和 `lookupswitch` 开头有零到三个填充字节，使其 32 位操作数从四的整数倍地址开始。

`Ledger-g.class` 中从 pc 4 开始的 `grade` 字节如下：

```text
aa                 tableswitch at pc 4
00 00 00           padding to pc 8
00 00 00 2c        default: 4 + 44 = 48
00 00 00 06        low 6
00 00 00 0a        high 10
00 00 00 2a        case 6:  4 + 42 = 46
00 00 00 28        case 7:  4 + 40 = 44
00 00 00 26        case 8:  4 + 38 = 42
00 00 00 24        case 9:  4 + 36 = 40
00 00 00 24        case 10: 4 + 36 = 40
```

36 字节，一条指令，保存了整个 `switch (score / 10)`，包括 9 和 10 共享的分支。第 33 课中，同一个 `switch` 的原生构建需要边界检查、一条 `lea`、一条 `movslq`、一条 `add`、一次间接跳转，以及另一个节中的五项重定位。这里，目标就在指令中，目标属于同一个结构这一事实也在其中。

`disassemble_jvm()` 覆盖全部 202 个已定义操作码及其操作数宽度，遵循填充规则，并按 `javap` 的方式显示操作数。`compare_with_javap()` 解析采集的 `javap -c -p` 文本，包括多行 `tableswitch` 块，核对每条指令的偏移、助记符和操作数。四种构建的 108 条指令全部一致。测试 `test_branch_offsets_are_relative_to_the_branch_instruction` 检查 pc 1 的 `ifne` 落在 6、13 的 `if_icmpge` 落在 33，以及 30 的 `goto` 跳回 10。

为这些课程从源码构建的 radare2 6.2.4 也能读取同一文件。`rabin2 -I` 报告 `arch java`、`lang java 21`、`linenum true` 和 `lsyms true`，这是它对版本和两个调试表的解读。`pd 14 @ sym.Ledger.grade` 输出 `tableswitch`，用箭头指向五个目标。它还会对这个文件输出 `Unable to parse code attribute: 2`。这是工具自己说明的限制，也是继续以 `javap` 为参照的理由。与 Python 相比，这种格式的反编译器更成熟。CFR 0.152 使用 MIT 许可证。Procyon 0.6.0 和 Vineflower 1.12.0 使用 Apache-2.0；Vineflower 是支持 Java 21 的 Fernflower 分支。Fernflower 本身位于 IntelliJ Community 仓库。JADX 1.5.6 支持 Android DEX 格式，JD-GUI 的最后一次发布在 2019 年。Harrand、Soto-Valero、Monperrus 和 Baudry 在 2020 年评测了八种反编译器。最好的工具对 84% 的类生成语法正确的输出，对 78% 生成语义等价的输出。他们的元反编译器恢复了任何单一工具都无法处理的类中的 37.6%。类型、名称和经过校验的栈让这种格式适合反编译，但无法让任何一个反编译器无所不能。

## Wasm 模块是一组节

核心规范将模块定义为前导字节 `00 61 73 6d 01 00 00 00`，即字符串 `\0asm` 和版本 1，后面跟各个节。每节包含一个 id 字节、一个 LEB128 编码的 `u32` 大小和内容。id 1 到 13 是已知节，各自最多出现一次，并按规定排序。id 0 是带名称的自定义节，可以出现在任意位置。所有整数使用 LEB128，所以 `e4 00` 是 100，`80 08` 是 1024。对 `ledger.wasm` 运行 `wasm-objdump -h` 会列出七个节，`WasmModule` 找到相同的七个节，载荷偏移也一致：

| 节 | 载荷范围 | 数量 | 为 ledger 保存的内容 |
|---|---|---|---|
| Type | 10 到 26 | 3 | `(i32) -> nil`、`(i32, i32) -> i32`、`(i32) -> i32` |
| Import | 28 到 39 | 1 | 类型为 0 的 `env.log` |
| Function | 41 到 46 | 4 | 每个已定义函数的类型索引 |
| Memory | 48 到 51 | 1 | 一页，没有最大值 |
| Export | 53 到 110 | 5 | `memory` 和四个函数名 |
| Code | 113 到 271 | 4 | 分别为 23、63、44、23 字节的函数体 |
| Data | 273 到 290 | 1 | 偏移 1024 处的 `F\0D\0C\0B\0A\0` |

Function 和 Code 分开，允许浏览器在整个文件到达前开始编译。每个代码条目包含大小、局部变量声明向量和表达式。`grade` 的局部变量向量是 `01 7f`：一组，包含一个 `i32`。这就是 `bucket`，保留类型，没有名称。

控制流从构造上就是结构化的。规范要求分支只能指向包围它的 `block`、`loop` 或 `if` 结构。标签按嵌套深度索引。`br_table` 通过索引标签列表的操作数执行间接分支。在文件偏移 `0xa3` 处解码 `grade` 的 switch：

```text
0e                  br_table
0b                  11 labels follow
04 04 04 04 04 04   buckets 0 to 5: label 4, the outermost block, returns 0
03 02 01 00         buckets 6, 7, 8, 9: labels 3, 2, 1, 0
00                  bucket 10: label 0, shared with 9
04                  default label 4
```

每个标签表示深度。标签 0 是最内层的 `block`，其 `end` 之后是 `i32.const 4`，再通过 `br 4` 跳出结果块。表前的六条 `block`、十一个标签和表后的五条 `br` 就是整个 `switch`；任何跳出结构约束的分支都会被校验器拒绝。`disassemble_wasm()` 跟踪深度，让清单像 `wasm-objdump` 一样缩进，覆盖从 `unreachable` 到 `i64.extend32_s` 的所有单字节操作码，并且在两个构建的全部 77 条指令上都与采集的 `wasm-objdump -d` 一致。

普通模块丢弃的是名称。`wasm-objdump` 仍会输出 `<grade>`，因为 Export 节把该字符串映射到函数索引 2，读取器也一样。290 字节的文件中没有任何局部变量名。`wat2wasm --debug-names` 会加入名为 `name` 的自定义节，包含模块名、函数名和局部变量名子节。文件增大到 425 字节。读取器在函数 2 找到 `{0: 'score', 1: 'bucket'}`，在函数 3 找到 `{0: 'values', 1: 'count', 2: 'sum', 3: 'i'}`。`wasm-strip` 会再次移除这个节。tool-conventions 仓库描述了另外两种载体。DWARF 可以作为 `.debug_*` 自定义节嵌入；`sourceMappingURL` 自定义节可以指向 source map，其中的列号是二进制中的字节偏移。

2026 年间工具发生了变化。2026-09-15 发布的 wabt 1.0.42 移除了 `wasm-decompile`，本机的 Homebrew 构建恰好包含剩余十一种工具。wasm-tools 1.261.0 提供 `print`、`objdump` 和 `demangle`。Binaryen version_133 提供 `wasm-dis`。radare2 6.2.4 也能读取模块，其 `rabin2 -I` 输出 `arch wasm`。它将 `grade` 的符号起点设为局部变量向量开始的 `0x8e`，而 `wasm-objdump` 在大小字段开始的 `0x8b` 标记函数。它的清单使用旧助记符 `get_local`、`set_local`，以及显示标签数量的 `brtable 11 4 4 ...`。三个工具看到的字节相同，但拼写不同，所以比较时必须说明采集清单所用的工具。本课调研没有在 Ghidra 的处理器目录中找到 WebAssembly 处理器模块，也没有完整阅读该目录清单。第三方 ghidra-wasm-plugin v2.4.0 面向 Ghidra 12.0。规范本身是持续更新的文档。`wasm-core-2` 的 W3C 页面是 2026 年 10 月 13 日的候选推荐草案，摘要描述 3.0 版本，编辑草案也标记同一日期。

## ECMA-335 元数据是程序自带的数据库

.NET 程序集是 PE 文件。`LedgerNet.dll` 以 `MZ` 开头，包含 `.text`、`.rsrc` 和 `.reloc` 三个节，并声明机器类型 `0x14c`，因为编译器生成的是平台中立代码。可选头部的数据目录 14，也就是 CLR Runtime Header，指向 RVA `0x2008`。ECMA-335 II.25.3.3 定义了此处的 72 字节：

```text
48 00 00 00   Cb 72
02 00 05 00   MajorRuntimeVersion 2, MinorRuntimeVersion 5
78 21 00 00   MetaData RVA 0x2178
84 07 00 00   MetaData size 1924
01 00 00 00   Flags: COMIMAGE_FLAGS_ILONLY
05 00 00 06   EntryPointToken 0x06000005, MethodDef row 5, which is Main
```

RVA `0x2178` 处的元数据根以签名 `42 53 4a 42` 开始，读作 `BSJB`，接着是版本 1.1 和字符串 `v4.0.30319`。随后是五个流头：偏移 `0x6c` 的 `#~`，以及 `#Strings`、`#US`、`#GUID` 和 `#Blob`。II.24.2 规定每种流最多出现一次。`#~` 流以 `HeapSizes` 字节和 64 位 `Valid` 掩码开头。这里 `HeapSizes` 为零，所有字符串、GUID 和 blob 索引都占两个字节。掩码说明有哪些表，其中十四个位被置一：

| 表 | Id | 行数 | 行大小 | 行的含义 |
|---|---|---|---|---|
| Module | 0x00 | 1 | 10 | 模块名及其 GUID |
| TypeRef | 0x01 | 21 | 6 | `System.Object`、`System.Console` 及另外 19 项 |
| TypeDef | 0x02 | 4 | 14 | `<Module>`、`Ledger` 及两个编译器辅助类 |
| Field | 0x04 | 2 | 6 | `Labels` 和静态数组初始化器 |
| MethodDef | 0x06 | 6 | 14 | 五个方法和 `.cctor` |
| Param | 0x08 | 5 | 6 | `before`、`after`、`score`、`values`、`score` |
| MemberRef | 0x0a | 16 | 6 | 12 个属性构造函数及 `Main` 调用的 4 个方法 |
| CustomAttribute | 0x0c | 12 | 6 | 编译器与 SDK 添加的属性 |
| StandAloneSig | 0x11 | 3 | 2 | 三个局部变量签名 |
| Assembly, AssemblyRef, ClassLayout, FieldRva, NestedClass | | 1, 2, 1, 1, 1 | | 标识、引用、布局 |

行大小并不直接存储。II.22 规定每列的类型，II.24.2.6 给出大小规则。堆索引按 `HeapSizes` 占两或四个字节。简单表索引在该表不足 65536 行时占两个字节。可指向 n 个表、带 b 个标签位的编码索引，在所有这些表都不足 2^(16-b) 行时占两个字节。`CliAssembly` 根据这些规则和行数计算十四个表的行大小。夹具中的 System.Reflection.Metadata 转储给出相同大小与相同表偏移，测试据此验证计算。

III.1.9 定义了 token：最高字节是表，最低三个字节是从 1 开始的行号。`0x06000002` 是 `MethodDef` 第 2 行。该行的 RVA 为 `0x2060`，名称为 `Grade`，签名 blob 为 `00 01 08 08`：默认调用约定、一个参数、返回 `int32`、参数为 `int32`。它的 `ParamList` 指向 `Param` 第 3 行，其中的名称是 `score`。正因为有 Param 表，ILSpy 才能从去除符号的发布构建中输出 `Grade(int score)`。RVA `0x2060` 处的方法体以 fat 头部开始：

```text
13 30         flags 0x13: fat, init locals; size 3 dwords
02 00         MaxStack 2
2d 00 00 00   CodeSize 45
01 00 00 11   LocalVarSigTok 0x11000001
```

`StandAloneSig` 第 1 行保存 `07 01 08`：`LOCAL_SIG`、一个局部变量、`int32`。局部变量有类型，没有名称。ECMA-335 将局部变量名放在第 V 部分的调试交换格式中，.NET SDK 则将它们写入 PDB。本夹具使用 `DebugType` none 构建，因此没有任何表或文件携带名称 `bucket`。`PercentChange` 使用 tiny 头部：首字节 `3a` 是 `0x0e << 2 | 2`，表示 14 字节的方法体，无局部变量，默认栈深为 8。

使用第 III 部分的操作码表可以解码 `Grade` 的 45 个代码字节。`switch` 是操作码 `0x45`，后跟 `u32` 数量和对应数量的 `int32` 目标，目标相对于表之后的指令：

```text
IL_0000: 02           ldarg.0
IL_0001: 1f 0a        ldc.i4.s 10
IL_0003: 5b           div
IL_0004: 0a           stloc.0
IL_0005: 06           ldloc.0
IL_0006: 1c           ldc.i4.6
IL_0007: 59           sub
IL_0008: 45 05 00 00 00 08 00 00 00 06 00 00 00 04 00 00 00 02 00 00 00 02 00 00 00
                      switch (IL_0029, IL_0027, IL_0025, IL_0023, IL_0023)
IL_0021: 2b 08        br.s IL_002b
IL_0023: 1a 2a        ldc.i4.4, ret
```

编译器在 `switch` 前减去 6，因此 case 6 是第一个目标。`disassemble_cil()` 通过各表解析 token，显示 `ldsfld Labels`、`call Grade`、`call System.Console::WriteLine`，以及来自 `#US` 堆的 `ldstr ' '`。这些结果的参照是夹具中的短 C# 程序 `MetaDump`，它使用 ILSpy 内部的库 `System.Reflection.Metadata`。它输出每个表的行数、大小和偏移，每个方法的 RVA、签名、参数名和 IL 字节，以及 `System.Reflection.Emit.OpCodes` 的 226 个字段。`compare_with_metadump()` 的全部 246 项检查都一致。运行时表有 218 个操作码和八个 `prefix` 占位项。本课的表有 219 项，因为它包含 III.2.2 的 `no.`，而 Emit 表从未包含它。

这种格式的工具包括：ILSpy 11.0（MIT，2026-08-12 发布）通过 Avalonia 桌面构建运行于 macOS。`ilspycmd` 11.1.0.9782 用 `-il` 输出 IL，用 `-m 0x06000002` 按 token 选择方法。dnSpyEx 6.6.0 延续 dnSpy，只支持 Windows。IL 反汇编器 `ildasm` 以 NuGet 包发布，而非内置于 SDK。radare2 6.2.4 也能读取元数据：`rabin2 -I` 输出 `arch cil` 和 `class PE32`，`is` 列出 `Ledger.Grade(int:score):int`，其参数名和两个类型来自 Param 表和签名表。这个构建没有 CIL 反汇编器。夹具使用 .NET SDK 8.0.205 构建，因为构建机器安装的是这个 SDK。自 2025-11-11 起，.NET 10 是当前版本，它写入相同的 ECMA-335 结构。

## 每种容器保留什么

将五种容器的 `grade` 放进同一张表。每一行都来自对夹具运行读取器的 `python3 code/main.py keeps`：

| 容器 | 函数体字节数 | 函数名 | 参数名 | 参数和返回类型 | 局部变量名 | 行号 | 控制流 |
|---|---|---|---|---|---|---|---|
| ELF 对象，clang -O0 | 118 | `.symtab` 中的 `grade` | 无 | 无 | 无 | 无，没有 `.debug_*` 节 | 5 次跳转，以及 1 次通过重定位表的间接跳转 |
| CPython 3.14 pyc | 96 | `co_qualname` | `score` | 无 | `bucket` | `co_linetable`，首行为 10 | 4 对比较与 `POP_JUMP_IF_FALSE` |
| JVM class，`javac -g` | 50 | 常量池 | `LocalVariableTable` 中的 `score` | `(I)I` | 参数以外没有 | `LineNumberTable`，6 行 | 1 条 `tableswitch` |
| WebAssembly | 63 | Export 节 | 只有 name 节存在时才有 | `(i32) -> i32` | 只有 name 节存在时才有 | 无 | 6 个嵌套块、1 条 `br_table`、4 条 `br` |
| .NET 程序集 | 45 | `MethodDef` | `Param` 中的 `score` | `static int32(int32)` | 无，只有 `StandAloneSig` 中的类型 | 没有 PDB 就没有 | 1 条 `switch`、1 条 `br.s` |

这张表解释了你将看到的反编译结果。第 34 课比较了 `int total(const int *, int)` 和 Ghidra 从原生代码推断出的 `int total(long param_1, uint param_2)`，因为原生代码不保留这些信息。pyc 保留所有名称而没有类型，控制流是每个版本形态都可能变化的跳转，所以 Python 反编译器会随版本失效，却能直接恢复名称。class 文件保留类型和经过校验的栈，开启 `-g` 时保留名称，并用一条指令表示 `switch`。Wasm 模块从构造上保留结构，因此 `wasm2wat` 可以无损往返，损失的只有名称。.NET 程序集保留最完整的描述，因为元数据表具有规范约束力，但恢复局部变量名仍需要 PDB。

这张表说明反编译器有哪些材料，以及输出中哪些是复制的存储事实、哪些是推断。ILSpy 输出中的参数名是复制；同一输出中的局部变量名，除非有 PDB，否则就是推断。第 35 课将这一区别记为每条主张的权威来源。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/43-bytecode-and-managed-formats
python3 code/main.py
```

输出是一份 JSON 报告。对每个 pyc，它给出两种头部、文件和 `grade` 的大小、采集清单中的指令数量与操作码名，以及当前解释器能否读取。对每种 class 构建，它给出版本、大小、调试表计数和 `javap` 一致性。对每种 Wasm 构建，它给出节、类型、函数、name 节内容和 `wasm-objdump` 一致性。对程序集，它给出 CLI 头部、流、表行数、方法和 System.Reflection.Metadata 一致性。报告最后是保留信息表，以及 `PATH` 中发现的解释器列表。

按以下顺序阅读 `code/main.py`：

1. `Reader` 保存游标与整数宽度。`uleb()` 和 `sleb()` 是 Wasm 和 .NET blob 堆所需的 LEB128 读取器。
2. `read_pyc_header()`、`Unmarshaller` 和 `PycFile` 读取 pyc。`parse_dis_text()` 读取采集的 `dis` 清单，让跨版本比较无需在测试时安装四个解释器。
3. `ClassFile` 读取 class 文件，`disassemble_jvm()` 解码代码。`parse_javap_code()` 和 `compare_with_javap()` 负责参照核对。
4. `WasmModule` 读取各节，`disassemble_wasm()` 按深度解码表达式。`compare_with_wasm_objdump()` 负责参照核对。
5. `CliAssembly` 遍历 PE、CLI 头部、元数据根、流和表。`TABLE_SCHEMAS` 和 `CODED_INDEXES` 是 II.22 和 II.24.2.6 的数据表示。`disassemble_cil()` 解码方法体，`compare_with_metadump()` 检查结果。
6. `NativeObject` 读取列出函数符号所需的 ELF 信息，用第 33 课的清单作为文本。`what_each_keeps()` 和 `figure_data()` 构建比较结果。

另有五个命令。`python3 code/main.py pyc FILE`、`class FILE`、`wasm FILE` 和 `dll FILE` 输出指定文件的结构及每个函数的清单。`python3 code/main.py compare` 用 `PATH` 中每个解释器编译 `ledger.py`，输出各自写入的内容。

## 实际使用

对自己构建的容器，按以下顺序使用读取器。

1. 读取开头字节并识别格式。两个字节后跟 `0d 0a` 表示 pyc，`ca fe ba be` 表示 class 文件，`00 61 73 6d` 表示模块，`4d 5a` 且设置了数据目录 14 表示程序集。
2. 读取头部并记录其中标明的生成器版本。pyc 看魔数字，class 文件看主版本，程序集看运行时和元数据版本字符串。
3. 运行计划使用的每个反编译器之前，先确认它支持这个版本。记录上限及工具说明该上限的位置。
4. 对同一个文件运行读取器和该格式自己的工具，逐行比较。不一致意味着读取器有 bug 或工具发生变化；在把清单当作证据前，必须先弄清原因。
5. 为关注的函数填写保留信息表。将每个事实标为保留或丢失，并注明来源表、属性或节。
6. 完成后再读反编译输出。标明其中每个名称和类型是复制保留事实，还是推断结果。

将参照文本文件与容器一起保存。解释器、JDK、SDK 或 wabt 版本改变时，用 `build_fixtures.sh` 重建并重新采集，因为清单变了，夹具也就变了。

## 交互实验

### 实验 A：先读头部，再读代码对象

从 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/43-bytecode-and-managed-formats/code
python3 -q
```

运行：

```python
from main import *
pyc = load_pyc("ledger.cpython-311.pyc")
pyc.header.to_dict()
pyc.module.names
pyc.functions()["grade"].varnames
len(pyc.functions()["grade"].code)
```

第一次调用前先写下魔数字。然后加载 `ledger.cpython-314.pyc`，比较两个 `code` 的长度。接着在自己的解释器下，对 3.11 文件尝试 `import marshal; marshal.loads(pyc.data[16:])`，阅读错误。

### 实验 B：常量池引用链

```python
cls = load_class("Ledger-g.class")
cls.constant(13)
cls.constant(14)
cls.describe_constant(13)
[row["text"] for row in jvm_listing(cls, "grade")]
```

调用 `describe_constant` 前，先手动从 `#13` 跟踪到 `#8` 和 `#14`，再到 `Utf8` 条目。然后加载 `Ledger-gnone.class`，对两个对象都调用 `cls.method("grade").attribute_names()`。`Code` 数组相同，属性不同。

### 实验 C：深度与标签

```python
module = load_wasm("ledger.wasm")
[(row["depth"], row["text"]) for row in wasm_listing(module, "grade")]
module.function_name(2)
load_wasm("ledger-names.wasm").names["locals"][2]
```

找到 `br_table` 行，读取深度。数一数后面的 `end` 行，将每一行与表中的标签号对应。然后打开 `ledger.wat`，找到标签 3 对应的 `block $six`。

### 实验 D：从 token 到字节

```python
asm = load_assembly("LedgerNet.dll")
asm.method("Grade")
body = asm.method_body(asm.method("Grade")["RVA"])
body.fat, body.max_stack, body.code_size, hex(body.local_signature_token)
asm.token_text(0x11000001)
[row["text"] for row in cil_listing(asm, "GradeLabel")]
```

根据 `.text` 节头手动计算 RVA `0x2060` 的文件偏移，与 `asm.rva_to_offset(0x2060)` 比较。然后查看 `asm.row(0x08, 3)`，找到名称 `score` 的存放位置。

## 实践实验

为比较增加第五种源语言，或为表格增加第六项事实。

要求：

- 使用已有编译器的语言编写一个含循环和局部变量的函数，例如将 Kotlin 编译为 class 文件，或将 Rust 编译为 Wasm 模块。提交输出与参照清单，并在 `build_fixtures.sh` 中写明精确命令。
- 让相应读取器的每条指令都与参照一致。只有夹具需要时才增加操作码。
- 扩展 `what_each_keeps()`，加入新容器，并为所有容器增加一项事实：函数体是否携带异常表或 `try` 区域。
- 在 `figure_data()` 中加入新容器，重新生成 `site/figures-re-43.js`。
- 编写测试：读取器声称保留某个事实，却没有说明保存它的表、属性或节时，测试必须失败。

成功标准是 `python3 code/main.py keeps` 显示新行，每个单元格都有证据，而且所有参照比较仍然一致。

## 交付产物

本课提供 `outputs/skill-bytecode-and-managed-formats.md`。用它将字节码容器转化为头部报告、经过核对的单函数清单，以及将每个名称、类型和结构标为保留或丢失的事实表。它要求以格式自己的工具作为参照，在使用任何反编译器前检查版本，并说明每个丢失事实原本应存放在哪里。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/43-bytecode-and-managed-formats
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 四个 pyc 头部分别包含魔数字 3495、3531、3571、3627，标志 3 和 8 字节哈希；时间戳文件的标志为 0、mtime 为 1791975565、大小为 497
- 3.11 及以后每个魔数字都落在 `2900 + 50n` 规则给出的对应发布范围内
- 反序列化器对当前解释器写入的文件，返回的名称、常量、代码字节、变量名和行表与 `marshal.loads()` 一致
- 四个文件都保留模块名称、`grade` 的 `('score', 'bucket')`、首行 10，以及文件名 `ledger.py`
- 四个版本的 `grade.co_code` 分别为 80、62、70、96 字节，采集清单分别有 31、26、26、35 条指令
- 3.11 清单有 `POP_JUMP_FORWARD_IF_FALSE`，3.12 和 3.13 有 `RETURN_CONST`，3.14 有 `LOAD_SMALL_INT`、`LOAD_FAST_BORROW` 和 `NOT_TAKEN`
- 3.14 的 `-C -O` 清单在 `grade` 中显示 13 个缓存项，其中五个在 `BINARY_OP` 后，自适应清单显示 `COMPARE_OP_INT`
- 缺少 `0d 0a` 的头部、截断头部，以及不是代码对象的主体都抛出 `FormatError`
- 只有当前解释器写入的 pyc 才提供指令清单，且与采集的 `dis` 输出一致
- class 文件主版本为 65 或 69，大小分别为 1581、1832、1404、1581，常量池计数分别为 82、94、79、82
- 常量 `#13` 解析为 `Method Ledger.grade:(I)I`，`#47` 解析为 `String F`
- 四种构建中 JVM 反汇编器的全部 108 条指令都与 `javap -c -p` 一致
- pc 4 的 `tableswitch` 占 36 字节，low 为 6，high 为 10，default 为 48，目标为 46、44、42、40、40
- 三种调试级别改变属性数量，但 `grade` 的 50 个代码字节保持一致
- `ifne`、`if_icmpge` 和 `goto` 的目标都相对于分支操作码
- 错误魔数、尾随字节和未定义操作码都会抛出 `FormatError`
- 七个 Wasm 节的载荷偏移与 `wasm-objdump -h` 输出一致，带名称的构建在 293 到 425 处增加 `name` 自定义节
- 类型、`env.log` 导入、五个导出及 1024 处的数据段都按 `ledger.wat` 解码
- 两种构建中 Wasm 反汇编器的全部 77 条指令都与 `wasm-objdump -d` 一致
- `grade` 有 6 个嵌套块、深度 6 处标签为 `4 4 4 4 4 4 3 2 1 0 0` 且默认值为 4 的 `br_table`，以及一个 `i32` 局部变量
- 没有 name 节时，函数名来自导出；局部变量名只有 name 节中才有
- LEB128 的 `e4 00` 为 100，`7f` 为 -1，`80 08` 为 1024，块类型的显示与 `wasm-objdump` 一致
- 错误前导、版本 2 和未知操作码都抛出 `FormatError`
- 程序集为 PE32，机器类型为 `0x14c`，CLI 头部位于 RVA `0x2008`，运行时为 2.5，标志为 `ILONLY`，入口为 `0x06000005`
- 元数据版本为 `v4.0.30319`，存在五个流，十四个表的行数与行大小都与参照报告一致
- .NET 读取器与 System.Reflection.Metadata 的全部 246 项检查一致
- `Grade` 的参数是 `score`，签名为 `static int32(int32)`，fat 头部的 `MaxStack` 为 2，代码为 45 字节，并有一个无名称的 `int32` 局部变量
- CIL `switch` 目标，以及 `br.s`、`ldsfld`、`call`、`ldstr` 的操作数通过各表和堆解析
- CIL 操作码表覆盖每个运行时操作码，只额外加入 `no.`
- 保留信息表在四种容器中报告参数名，原生代码中没有；在三种容器中报告类型
- 演示中每条参照比较都显示 n 项中的 n 项一致
- 交互图嵌入的数据与 `figure_data()` 生成的数据相同

## 生产环境故障模式

| 故障 | 能力不足的工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 反编译器比解释器旧 | `Unsupported opcode`、输出标为不完整，或声称经过混淆 | 魔数字、它标明的版本，以及工具文档中的支持上限 |
| 用错误解释器读取 pyc | `marshal.loads` 抛错或返回垃圾 | 本课反序列化器能读取 3.9 到 3.15 文件的名称、常量和大小，指令来自匹配的 `dis` |
| 将特化操作码误认为文件内容 | 清单中的 `COMPARE_OP_INT` | pyc 保存非特化形式，特化在预热后的内存中发生 |
| 声称默认 javac 构建保留局部变量名 | 将 `var1`、`var2` 当作源码名 | `LocalVariableTable` 只在启用 `-g` 时存在，两种情况下 50 个代码字节都相同 |
| 分支目标相差一个指令长度 | JVM 清单的跳转落在指令中间 | 偏移相对于分支操作码，并与 `javap` 核对 |
| 跳过 switch 填充 | `tableswitch` 默认目标错误，case 全部错位 | 零到三个填充字节使 pc 四字节对齐，五个 case 共 36 字节 |
| 假定 Wasm 名称已被剥离 | “没有符号” | 导出为每个导出函数命名，局部变量需要 `name` 节，`wasm-strip` 只移除该节 |
| 三个工具，三种写法 | `get_local` 与 `local.get`，函数位于 `0x8b` 与 `0x8e` | 字节相同，并注明比较所采集清单的工具 |
| 猜测表行大小 | 第一个表之后的每一行都读错 | 行大小由 `HeapSizes`、行数和编码索引宽度计算，且与参照一致 |
| 期待发布程序集包含局部变量名 | 将 `V_0` 当作源码名 | 局部变量类型在 `StandAloneSig` 中，名称只在 PDB 中；`DebugType` none 没有写入 PDB |
| 读取器猜测未知操作码或类型码 | 看似合理的助记符 | 携带偏移的 `FormatError`，参照比较在此停止 |
| 参照来自另一次构建 | 测试在过期文本上通过 | `build_fixtures.sh` 写明每个工具版本，并写入 `versions.txt` 和 `sha256.txt` |

## 操作规则

先读头部，识别它指向的生成器。用遇到未知内容就拒绝的读取器解析容器，在同一文件上与格式自己的工具核对清单。然后，对反编译输出中的每个名称和类型，说明它是容器存储的，还是工具推断的。

## 延伸阅读

- [PEP 552: 确定性 pyc](https://peps.python.org/pep-0552/)
- [CPython `Include/internal/pycore_magic_number.h`](https://github.com/python/cpython/blob/main/Include/internal/pycore_magic_number.h)
- [Python `marshal` 模块文档](https://docs.python.org/3/library/marshal.html)
- [CPython `Python/marshal.c`](https://github.com/python/cpython/blob/main/Python/marshal.c)
- [Python 3.14 `dis` 模块文档](https://docs.python.org/3.14/library/dis.html)
- [PEP 659: 特化自适应解释器](https://peps.python.org/pep-0659/)
- [PEP 626: 面向调试与其他工具的精确行号](https://peps.python.org/pep-0626/)
- [PEP 790: Python 3.15 发布计划](https://peps.python.org/pep-0790/)
- [uncompyle6 （PyPI）](https://pypi.org/project/uncompyle6/), [decompyle3 （PyPI）](https://pypi.org/project/decompyle3/), [xdis （PyPI）](https://pypi.org/project/xdis/), [pycdc （GitHub）](https://github.com/zrax/pycdc), [PyLingual （GitHub）](https://github.com/syssec-utd/pylingual)
- [Java 虚拟机规范，Java SE 25，第 4 章：class 文件格式](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html)
- [Java 虚拟机规范，Java SE 25，第 6 章：Java 虚拟机指令集](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-6.html)
- [javac 手册，Java SE 25](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html) 与 [javap 手册](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javap.html)
- [CFR](https://www.benf.org/other/cfr/), [Procyon](https://github.com/mstrobel/procyon), [Vineflower](https://github.com/Vineflower/vineflower), [intellij-community 中的 Fernflower](https://github.com/JetBrains/intellij-community/tree/master/plugins/java-decompiler/engine), [JADX](https://github.com/skylot/jadx)
- [Harrand, Soto-Valero, Monperrus, Baudry, "Java Decompiler Diversity 与 its Application to Meta-decompilation" (JSS 2020)](https://arxiv.org/abs/2005.11315)
- [ECMA-335，公共语言基础设施，第 6 版（2012 年 6 月）](https://ecma-international.org/publications-and-standards/standards/ecma-335/)
- [PE 格式，Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [System.Reflection.Metadata.Ecma335.TableIndex](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.metadata.ecma335.tableindex)
- [ILSpy （GitHub）](https://github.com/icsharpcode/ILSpy), [ilspycmd （NuGet）](https://www.nuget.org/packages/ilspycmd), [dnSpyEx （GitHub）](https://github.com/dnSpyEx/dnSpy)
- [WebAssembly 核心规范：二进制格式，模块](https://webassembly.github.io/spec/core/binary/modules.html) 与 [值](https://webassembly.github.io/spec/core/binary/values.html)
- [WebAssembly 核心规范：自定义节（name 节）](https://webassembly.github.io/spec/core/appendix/custom.html)
- [WebAssembly 工具约定：调试](https://github.com/WebAssembly/tool-conventions/blob/main/Debugging.md)
- [wabt 1.0.42 发布说明](https://github.com/WebAssembly/wabt/releases/tag/1.0.42), [wasm-tools](https://github.com/bytecodealliance/wasm-tools), [Binaryen](https://github.com/WebAssembly/binaryen), [ghidra-wasm-plugin](https://github.com/nneonneo/ghidra-wasm-plugin)
- [radare2 （GitHub）](https://github.com/radareorg/radare2), 本课从源码构建的 6.2.4 版本
