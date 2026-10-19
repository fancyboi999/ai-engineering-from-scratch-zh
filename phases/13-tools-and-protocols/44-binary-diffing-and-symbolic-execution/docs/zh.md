# 二进制差异分析与符号执行：匹配函数并求解输入

> 两个函数的匹配，是某种质量的签名给出的主张；一个求解输入，是某条路径条件的一个模型。本课构建这两种方法，并与 radiff2、Ghidra、angr 和 z3 核验。

**类型：** Build
**语言：** Python、C、x86-64 汇编、Java（一个 Ghidra 脚本）
**前置要求：** 阶段 13 · 第 33 课（反汇编与控制流）、第 34 课（提升为伪代码）、第 36 课（重建并证明等价）
**预计时间：** 约 150 分钟

## 学习目标

- 从对象文件及其清单构建五种函数签名：精确字节、屏蔽重定位字段后的字节、助记符序列、流图形状和符号名。
- 运行 BinDiff 风格的分阶段贪心匹配器，只有签名在两边均唯一才接受匹配，并记录每项匹配的阶段和质量。
- 复现两个字节完全相同的函数在加载映像上无法通过字节关联器、屏蔽后却通过的情况，并用重定位计算解释四个变动字节。
- 根据 Levenshtein 距离复现 radiff2 的相似度，解释为何其中一个比率只在比较 radare2 到达的 82 个字节时出现。
- 在小型 IR 上枚举函数路径，为每条路径保留条件，并用有界搜索求解每个叶节点的输入。
- 测量带符号上界的循环产生的路径爆炸，将路径数、类别和模型与 angr 10.0.3、z3 5.1.0 比较。

## 问题背景

你以 `-O2` 重建 `ledger.c`，问 agent 与 `-O1` 构建相比发生了什么变化。agent 运行差异工具，报告 `grade` 被修改，因为两个加载后程序中的字节不同。随后，它耗尽预算去解释一个不存在的变更。两个对象文件中 `grade` 的 46 个字节完全相同。工具比较的是重定位后的映像，而 `-O2` 程序的 `.rodata` 向后移动了 0x70 字节，因此 `grade` 中一个位移也增加了 0x70。

当天下午，你又问哪个 score 使 `grade` 返回 4。agent 阅读伪代码后回答“90”。这是一个答案。但对 90 到 109 的所有 score，函数都返回 4，而且问题没有限定边界。你需要集合，agent 却只给了样本。

两次失败来自同一个缺口。匹配和求解输入都是有方法支撑的主张。本课用 Python 标准库构建这两种方法，并在旁边运行生产工具。工具与代码一致时，你有两条推导；不一致时，你有需要检查的地址、字节或边界。

```figure
re-44-matches-and-paths
```

## 函数签名是带有质量的主张

Flake 在 2004 年将二进制差异分析表述为：在两个相似可执行文件的函数集合间构建同构。Dullien 和 Rolles 在 2005 年将其扩展到基本块和指令。BinDiff 的概念页面描述了由此形成的策略：为两边每个函数计算一种属性。一个值在两边都恰好出现一次，就是匹配。出现多次则有歧义，要在该等价类内部用下一个属性继续细分。没有对应项的值保持未匹配。每轮过后，新匹配项的调用者和被调用者形成小集合，下一个属性更可能在其中唯一；再用下一个属性重复这一过程。

每种匹配算法都有质量评级。该页面将原始函数字节哈希匹配和名称哈希匹配评为很好，将流图 MD 索引和素数签名匹配（每个助记符对应一个小素数，对函数内全部素数求积）评为好，将字符串引用评为中，将循环数量或地址序列评为差。匹配置信度是产生它的算法质量的平均值，再用 sigmoid 加权。函数相似度大约由 25% 的已匹配流图边、15% 的已匹配基本块、10% 的已匹配指令和 50% 的流图 MD 索引差异组成，再乘以置信度。

本课保留其中五种属性和最关键的一条规则：两边都唯一，否则不匹配。概念页面只提到 MD 索引，没有给公式，因此本课去掉它，改用简单的度数序列。质量标签仍然保留，因为匹配的可信程度受制于支撑它的最弱事实。

## 从一条函数记录得到五种签名

差异工具对每个对象读取两种信息。ELF 提供字节、符号大小和 `.rela.*` 记录。`llvm-objdump -d` 清单提供指令边界与助记符；第 33 课已证明解码器与这些对象清单中的每条指令一致。`function_record()` 检查清单中每条指令的字节是否等于对象对应地址的字节，否则报错。过期清单意味着夹具已改变。

以 `ledger-x86_64-O1.o` 的 `grade` 为例。符号给出偏移 0x10 和大小 46，因此记录覆盖 0x10 到 0x3e，不包含用于对齐下一个函数的两字节 `nop`。

精确字节签名是这 46 个字节的 SHA-256。屏蔽字节签名先将每个重定位字段清零。这里只有一个字段：偏移 0x36、宽四字节的 `R_X86_64_PC32 .rodata+0x10` 记录，它是 0x33 处 `leaq (%rip), %rcx` 的位移。在 RELA 对象中，这四个字节本来就是零，因此本课所有对象的所有函数中，两种签名都一致。屏蔽机制是为下一节准备的。

助记符签名对以下 14 个助记符序列求哈希：

```text
movslq imulq movq sarq shrq addl addl xorl cmpl ja movl leaq movl retq
```

流图形状签名来自第 33 课的基本块和带类型边，只保留从入口可达的块。`-O1` 的 `grade` 有三个块、三条边。块 0x10 以 `ja 0x3d` 结束，有一条跳转边和一条顺序执行边；块 0x31 顺序执行到 0x3d；0x3d 返回。度数序列按排序后的块列出各自（入度、出度），因此签名是 `3b 3e [0/2,1/1,2/0]`。`-O0` 的 `grade` 按第 33 课的方法，通过五项 `.rela.rodata` 解析间接跳转，得到八个块和十一条边，其中四条为 `table` 边。

名称签名就是符号名。它存在时是最强的事实；构建被剥离符号后，它就不存在。

另一个字段为后面的补丁案例保留。函数若具有指向 `.rodata` 的 `lea` 重定位、边界检查和索引加载，`referenced_table()` 就按第 36 课的方法读取表：`ja` 前的 `cmpl $0x4` 表示五项，加载 `movl (%rcx,%rax,4), %eax` 表示每项四字节。`-O1` 的 `grade` 在 `.rodata+0x14` 的表内容为 `1, 2, 3, 4, 4`。

## 贪心匹配器

`match_functions()` 按顺序运行各阶段。每阶段按该阶段的签名，对两边尚未匹配的函数分组；只接受两边都恰好有一个函数的值。匹配结果记录阶段、阶段质量、其他所有一致签名，以及相似度。

```python
for stage in order:
    for signature, candidates in left_groups.items():
        partners = right_groups.get(signature, [])
        if len(candidates) != 1 or len(partners) != 1:
            continue
        a, b = candidates[0], partners[0]
        agreeing = [s.id for s in STAGES if a.signatures()[s.id] == b.signatures()[s.id]]
        matches.append(Match(a, b, stage, agreeing, radare2_ratio(a.raw, b.raw), data_equal))
```

本课顺序先运行四个结构阶段，最后运行名称阶段，这样先检验结构阶段，再用名称评判结果。比较 `-O1` 与 `-O2`：

| 函数 | 阶段 | 一致签名 | 相似度 |
|---|---|---|---|
| `percent_change` | 精确字节 | 全部五种 | 1.000 |
| `grade` | 精确字节 | 全部五种 | 1.000 |
| `total` | 名称 | 只有名称 | 0.171 |
| `grade_label` | 精确字节 | 全部五种 | 1.000 |

`total` 从 31 字节、13 条指令增长为 140 字节、41 条指令，因为 clang 用 SSE2 向量化循环，并保留标量余数循环。其形状从五块五边变成十块十三边。结构信息没有存留下来，只有符号把两者关联起来。

比较 `-O0` 与 `-O1` 时，同样的顺序会产生一个错误匹配：

| -O0 函数 | -O1 匹配项 | 阶段 | 名称一致 |
|---|---|---|---|
| `percent_change` | `grade_label` | 流图形状 | 否 |
| `grade` | `grade` | 名称 | 是 |
| `total` | `total` | 名称 | 是 |
| `grade_label` | 未匹配 | | |

`-O0` 的 `percent_change` 是四块菱形：在 `before == 0` 处分支的入口、两个分支臂，以及返回前的汇合点。度数序列是 `0/2, 1/1, 1/1, 2/0`。`-O1` 的 `grade_label` 内联了 `grade`，其边界检查周围也是同样的菱形。这种形状在两边都唯一，所以规则接受它。中等质量标签就是警告，之后的名称阶段则与它矛盾。错误匹配还占用了右边的 `grade_label`，因此真正的 `percent_change` 和 `grade_label` 配对保持未匹配。

存在真实名称时，BinDiff 顺序将名称匹配放在第二阶段，代码中的 `BINDIFF_ORDER` 也如此。按这个顺序，四个 `-O0` 函数都凭名称匹配到 `-O1` 版本，与下文 Ghidra 报告一致。演示保留两种顺序，让失败可见。任何在返回前汇合的 `if` 和 `else`，流图都可能是这样的四节点形状。

## 相同字节，重定位后的操作数

Ghidra 导入对象时应用重定位，因此其字节关联器比较加载后的映像。第 36 课也正因此屏蔽重定位字段。`load_image()` 复现导入过程：按头部顺序遍历已分配节，分别按 `sh_addralign` 对齐，从 0x100000 开始布局。再应用每条记录：对 `R_X86_64_PC32` 和 `R_X86_64_PLT32`，将 `S + A - P` 写为 32 位有符号值；对 `R_X86_64_64`，将 `S + A` 写为 64 位值。

两份程序中所有节的起始位置都与 Ghidra 12.1.4 一致，测试套件用采集的 Version Tracking 输出核验这一点：

| 节 | `-O1` 程序 | `-O2` 程序 |
|---|---|---|
| `.text` | 0x100000，159 字节 | 0x100000，271 字节 |
| `.rodata` | 0x1000a0 | 0x100110 |
| `.rodata.str1.1` | 0x1000f0 | 0x100160 |

`-O2` 的 `.text` 因 `total` 增长而多出 112 字节，因此 `.rodata` 起点后移 0x70 字节。两份程序的 `grade` 都在 0x100010。偏移 0x33 的 `leaq` 的位移字段位于 0x36，结束于 0x3a。重定位加数 0x10 加上通常的 4，将表定位到 `.rodata+0x14`。

在 `-O1` 映像中：`0x1000a0 + 0x14 - 0x10003a = 0x7a = 122`。在 `-O2` 映像中：`0x100110 + 0x14 - 0x10003a = 0xea = 234`。一个映像的字段字节为 `7a 00 00 00`，另一个为 `ea 00 00 00`。46 字节中有一个不同，Levenshtein 比率为 0.978，精确字节阶段失败。屏蔽字节阶段将字段清零后通过。`grade_label` 与它的表都移动相同的 0x70，因此位移保持相等，在两种视图中都通过精确字节匹配。

Ghidra 报告相同区分。比较 `-O1` 和 `-O2` 时，Exact Function Bytes Match 找到 `percent_change` 和 `grade_label`，Exact Function Instructions Match 找到这两个再加 `grade`，Exact Function Mnemonics Match 也找到相同三个。指令关联器会屏蔽操作数，因而涵盖这个位移。本课的映像视图精确字节匹配恰好对应 Ghidra 字节关联器找到的两个函数，屏蔽字节一致项恰好对应指令关联器找到的三个。测试套件断言这两项集合相等。

rea 6.5.0 的 `compare_functions` 按行比较 provider 文本。在汇编维度，它附带限制说明“relocation normalization is unavailable”。本课加载器和屏蔽操作提供这种归一化。

## radiff2 测量什么

radare2 6.2.4 包含 `radiff2`。使用 `-AC` 时，它分析两个文件，为每个函数输出一行：左侧大小与地址、MATCH 或 UNMATCH、比率、右侧大小与地址。本课对象的采集结果如下：

| 配对 | `percent_change` | `grade` | `total` | `grade_label` |
|---|---|---|---|---|
| `-O0` 与 `-O1` | UNMATCH 0.130435 | UNMATCH 0.426829 | UNMATCH 0.106061 | UNMATCH 0.269841 |
| `-O1` 与 `-O2` | MATCH 1.000000 | MATCH 1.000000 | UNMATCH 0.171429 | MATCH 1.000000 |
| `-O1` 与 `-O1` | MATCH 1.000000 | MATCH 1.000000 | MATCH 1.000000 | MATCH 1.000000 |

radare2 源码的比率公式是 `1 - distance / max(len_a, len_b)`。distance 是两个函数指纹间的 Levenshtein 距离，指纹是按地址顺序拼接的函数基本块。匹配阈值为 0.7。`code/main.py` 的 `radare2_ratio()` 对原始函数字节实现同一公式，将 0.130435、0.106061、0.269841 和 0.171429 复现到小数点后六位。

它不能复现 `-O0` 的 `grade` 的 0.426829。对函数全部 118 字节，比率为 0.296610。radare2 的大小列输出 `118`，但指纹更短。没有应用重定位时，它无法解析跳转表，因此分析只到达入口块、以 `jmpq *%rax` 结束的块、默认 case 和返回：共 82 字节，与第 33 课普通递归下降声称覆盖的 82 字节相同。这 82 字节与 `-O1` 的 46 字节间的 Levenshtein 距离为 47，因此 `1 - 47/82 = 0.426829`。启用 `-e bin.relocs.apply=true` 后，radare2 找到全部 118 字节，输出 0.288136，等于本课对重定位映像计算的比率；映像的四个位移字节不同于对象中的零字段。两种工具只有比较同一批字节时才会一致，而大小列并不说明参与比较的是哪些字节。

`-O` 将指纹限制为操作码字节，并将操作数清零。`-O0` 对 `-O1` 的比率升至 0.239130、0.512195、0.303030、0.523810；`-O1` 对 `-O2` 的 `total` 升至 0.192857。工具也提供全文件距离：两个对象间，`-s`（Myers）报告相似度 0.956、距离 162，`-ss`（Levenshtein）报告 0.927、137。这些数字包含头部、符号表和重定位节，并不能说明函数的情况。

## Ghidra Version Tracking 关联器

Ghidra 的 Version Tracking 工具用关联器匹配源程序和目标程序。函数关联器包括 Exact Function Bytes Match、Exact Function Instructions Match（屏蔽操作数）、Exact Function Mnemonics Match，以及 Duplicate Function Instructions Match（1:N 和 N:M）。数据关联器有 Exact、Duplicate 和 Similar Data Match。符号关联器精确匹配名称、匹配重复项或按相似度匹配。引用关联器使用已接受匹配寻找更多匹配。目标程序中必须已定义函数，最小函数长度默认 10 字节。Auto Version Tracking 依次运行 Exact Symbol Name、Exact Data、Exact Function Bytes、Exact Function Instructions、Exact Function Mnemonics、Duplicate Function Instructions，最后是引用关联器，并为接受项创建隐含匹配。11.2 加入了 BSim 关联器。

本课以无界面方式采集关联器结果。`capture_ghidra_vt.sh` 将三个对象导入项目并运行短脚本 `ListVersionTrackingMatches.java`。该脚本继承 `AbstractGhidraVersionTrackingScript`，按路径打开源和目标程序，按 Auto Version Tracking 顺序运行六个非引用关联器，为每个块、函数、关联器和匹配输出一行。本节所有数字都来自这两个文本文件。

| 关联器 | `-O0` 到 `-O1` | `-O1` 到 `-O2` |
|---|---|---|
| Exact Symbol Name Match | 4 个函数 | 4 个函数，5 个数据项（`labels.rel`、`.L.str.1` 到 `.L.str.4`） |
| Exact Data Match | 0 | 0 |
| Exact Function Bytes Match | 0 | 2 (`percent_change`, `grade_label`) |
| Exact Function Instructions Match | 0 | 3（新增 `grade`） |
| Exact Function Mnemonics Match | 0 | 3 |
| Duplicate Function Instructions Match | 0 | 0 |

从 `-O0` 到 `-O1`，每个函数都改变了，因此只有名称匹配。这与本课匹配器按 BinDiff 顺序得到的结果一致。每项匹配都输出相似度 1.000、置信度 10.000。帮助页面却将精确关联器描述为相似度 1.0、置信度 1.0，因此输出置信度的尺度仍是一个开放问题，本课只记录，不作结论。

Tools 下的 Program Differences 是另一种功能。它比较相同地址空间中的两个程序，在相同地址上比较字节、标签、代码单元、引用、注释和函数。这是按地址对齐的差异比较，不会匹配任何移动过的内容。

## 依据文档了解 Diaphora 和 Binary Ninja

Diaphora 是 IDA Pro 插件，2015 年首次发布，截至 2026-08-18 的版本为 3.4.2。从 2.0 起使用 AGPL-3.0，需要 IDAPython，因此能在 IDA Home 或 IDA Pro 运行，不能在 IDA Free 运行。它将每个数据库导出为 SQLite，以 SQL 查询运行启发式规则。每条规则都有名称、Best/Partial/Unreliable 类别、比率类型，以及 SAME_CPU、SLOW 等可选标志。当前源码中的名称像本课更多阶段的版本：Bytes hash、Same address and mnemonics、Same cleaned assembly、Mnemonics small-primes-product、Same nodes, edges, loops and strongly connected components、Topological sort hash，以及需要 Hex-Rays 反编译器的伪代码模糊哈希。发布说明展示了调优历史：慢规则只在约 2,000 个函数以下运行，“Same graph” 被移到不可靠类别。这种调整就是本课四块菱形问题在大规模程序中的体现。

2026-09-03 发布的 Binary Ninja 6.0 将 Binary Similarity 加入为带 provider 和 resolver 的框架。它附带作为结构 provider 的 BinDiff，以及容忍可重定位操作数、用于精确函数匹配的 WARP。指南建议：函数除可重定位指令外相同时使用 WARP；重新编译后仍有结构关系时使用 BinDiff。该功能仅限 Ultimate 版。本机没有通过包管理器安装 Binary Ninja，也没有运行它，因此本段只依据文档。

BinDiff 自 2023-09-25 起以 Apache-2.0 开源，最新发布为 v8。它需要反汇编器和 BinExport 插件，后者支持 IDA Pro 9.4 及以后、Binary Ninja 和 Ghidra。学习者的免费路径是 Ghidra 加 BinExport 加 BinDiff 命令行。本课没有运行它，实践实验要求你运行。

## 相同代码，不同常量

第 36 课保留了 `grade` 的一个候选重建，它的表最后一项为 3，而原始值为 4。`grade_case10_wrong.o` 与 `-O1` 的 `grade` 拥有相同的 46 个代码字节。匹配器凭精确字节将它们配对，所有签名都一致。引用表检查通过一个重定位读到 `1, 2, 3, 4, 4`，通过另一个读到 `1, 2, 3, 4, 3`，报告 `dataEqual: false`。左边其余三个 `-O1` 函数没有匹配，因为候选对象只有一个函数。

这就是补丁分析的典型情况。只比较字节的函数差异工具会说没有变化。Ghidra 的 Exact Data Match 和 BinDiff 的字符串引用匹配也正因此存在。本课实现很小：对每一对匹配，比较各函数重定位指向的字节，数量来自边界检查，宽度来自加载指令。

## 符号执行：路径、条件与求解器

King 在 1976 年描述了符号执行。输入变成符号。每条语句更新符号存储。每个分支向路径添加条件，求解器判断路径是否可行，并生成遵循该路径的具体输入。带分支的函数变成路径树，叶节点是附带条件的返回。

Baldoni、Coppa、D'Elia、Demetrescu 和 Finocchi 在 2018 年综述了这一领域。他们在第 5 节将路径爆炸列为核心成本：执行器可能在每个分支处分叉，状态数可随分支数指数增长；上界依赖符号输入的循环则产生无界路径集合。缓解方法包括：每个分支都求解以剪去不可实现路径、函数和循环摘要、状态合并，以及欠近似。具体符号执行同时以具体和符号方式运行程序，记录具体运行沿途的条件，将其中一个取反，再向求解器请求下一个输入。代表系统是 DART（2005）、CUTE（2005）和 SAGE（2008）。

KLEE（Cadar、Dunbar、Engler，OSDI 2008）是运行于 LLVM bitcode 上的符号虚拟机，输入是 `clang -emit-llvm` 输出，而非二进制。它附带 POSIX 环境模型和重放库。在 89 个 GNU coreutils 程序上，它达到 84.5% 的行覆盖率，开发者测试则为 67.7%，并发现 56 个严重 bug。KLEE 3.2 于 2025-12-23 发布，使用 NCSA 许可证，推荐 LLVM 16。

angr 处理二进制。`angr.Project` 包含映射对象并应用重定位的 CLE 加载器、将块转换为 VEX IR（`block.vex`，也可选 pypcode）的提升器，以及状态工厂。`SimState` 保存寄存器、内存和求解器。`SimulationManager` 推进名为 `active`、`deadended`、`found`、`avoided`、`errored` 的状态集合，`explore(find=..., avoid=...)` 是其封装。每步按顺序运行引擎：失败处理、系统调用、hook、处理具体数据的 unicorn，最后以 VEX 兜底。claripy 是 Z3 上的求解器前端；在 angr 10.0 中，它是随包提供的 Rust 实现，通过 `from angr import claripy` 导入。angr 10.0.3 于 2026-10-10 上传，使用 BSD-2-Clause，要求 Python 3.12 或更高。Z3 5.1.0 于 2026-08-16 以 MIT 发布，是 angr、Triton 和 KLEE 可选后端所用的求解器。

## 第 34 课 IR 上的微型执行器

`code/main.py` 的执行器使用小型 IR，语句形状来自第 34 课：`Assign`、`Branch`、`Jump`、`Return`，再加上第 34 课实践实验要求的 `Switch` 终结指令。表达式包括 `Const`、`Var`、带宽度的 `Bin`、`Cast`、从命名具体表加载的 `Load`，以及 `Not`。四个夹具函数手工提升到第 34 课简化后的层级，即 `0x66666667` 乘法已变成 `score / 10`；每个 IR 块都列出原始指令地址。`check_ir_against_listing()` 断言这些地址恰好覆盖函数清单一次。

该 IR 中 `-O0` 的 `grade` 如下：

```text
0x30: local_8 = score; local_10 = score / 10 - 6; if (local_10 >u 4) goto 0x9a else 0x62
0x62: switch local_10 -> 0x91, 0x88, 0x7f, 0x76, 0x76
0x76: local_4 = 4; goto 0xa1        0x7f: local_4 = 3; goto 0xa1
0x88: local_4 = 2; goto 0xa1        0x91: local_4 = 1; goto 0xa1
0x9a: local_4 = 0                    0xa1: return local_4
```

switch 目标来自 `jump_table_targets()`，使用与第 33 课相同的重定位计算，因此 IR 读取的是夹具本身。

`execute()` 保存路径状态工作列表。状态包含当前块、块轨迹、条件列表，以及将每个变量映射为输入表达式的环境。`Assign` 将环境代入源表达式并保存结果。`Branch` 代入条件后向求解器询问两次：一次加入条件，一次加入条件的否定。无法满足的一侧被丢弃，这就是综述中的即时剪枝。`Switch` 按目标对表项分组，以表项等式的析取作为条件，为每个不同目标分叉一次；angr 处理符号跳转目标时也如此。`Return` 对返回值做代入，并关闭叶节点。轨迹超过步数上限时，将路径标为截断并停止。

手动跟踪通向 `return 4` 的路径。入口赋值 `local_10 = score / 10 - 6`。这条路径上的分支条件 `local_10 >u 4` 为假，所以条件列表有 `!(score / 10 - 6 >u 4)`。switch 的条目 3 和 4 都指向 0x76，因此通向 0x76 的分叉增加 `score / 10 - 6 == 3 || score / 10 - 6 == 4`。块 0x76 赋值 `local_4 = 4`，跳到 0xa1，返回经代入变为 `4`。叶节点就是这个条件和值组成的一对。

求解器是 `BoundedSearch`。它为每个输入保存有限域，枚举这些域的笛卡尔积，按 C 语义计算每个约束：32 位回绕、向零截断除法、有符号与无符号比较，以及算术或逻辑移位。除零或表索引越界会使该赋值不满足约束。`score` 在 -200 到 1200 时，`grade` 的五条路径花费 44,460 次求值、几毫秒。对每个叶节点求输入集合，得到：

| 叶节点 | 返回值 | 条件 | 边界内的 score |
|---|---|---|---|
| 0x76 | 4 | `!(q >u 4) && (q == 3 \|\| q == 4)` | 90 到 109，20 个输入 |
| 0x7f | 3 | `!(q >u 4) && q == 2` | 80 到 89，10 个输入 |
| 0x88 | 2 | `!(q >u 4) && q == 1` | 70 到 79，10 个输入 |
| 0x91 | 1 | `!(q >u 4) && q == 0` | 60 到 69，10 个输入 |
| 0x9a | 0 | `q >u 4` | 1,351 个输入，即边界内其余输入 |

`q` 代表 `score / 10 - 6`。`-O1` 的 `grade` 得到相同类别，但 IR 只有两条路径：返回 `lookup_14[q]` 的查表路径，以及返回 0 的默认路径。此时没有可到达的 case 块，问题变成对返回值的约束。表 `lookup_14` 从对象 `.rodata` 的 0x14 处读取。

边界是这种方法的限制。有界搜索在域内完备，在域外不作结论。在 -200 到 1200 内，60 到 109 的 score 都不返回 0，110 及以上的 score 都不返回非零值。z3 对全部 2^32 个 score 证明了两点，下一节则展示两种方法给出不同见证输入的地方。

## 测量路径爆炸

`-O1` 的 `total` 是第 33 课的循环：测试 `count`，循环体累加 `values[rdx]` 并递增 `rdx`，在 `rdx != rcx` 时由 `jne` 跳回循环体。IR 中 `rcx` 是 `zext64(count)`，`rdx` 从 0 开始。每次经过回边都按 `rdx != count` 分叉，此时 `rdx` 是常量，因此 `count = c` 的路径执行循环体 `c` 次后退出。将 `count` 限定为 0 到 2，执行器找到 3 条路径；0 到 4 找到 5 条；0 到 8 找到 9 条。每条路径返回该 count 的三角和：(0, 0)、(1, 1)、(2, 3)，直到 (8, 36)。angr 在三个优化级别都报告 3、5、9 个 deadended 状态和相同九组 count 与和，包括 `-O2`；其向量循环要求 count 至少为 8，因此在这个范围内不改变路径数量。

没有边界时，执行器永远不会完成，因为每个迭代次数都多出一条可行路径。将每条路径限制为 24 个块，并让 `count` 最大为 64，本课执行器返回 22 条路径、截断 2 条，存在的 65 条路径中还有 41 条根本没有开始。报告列出这三个数字。求解成本也会增长：边界为 2 时求值 33 次，4 时 115 次，8 时 531 次，受限运行则为 6,900 次。

## 用 angr 和 z3 回答同一组问题

`capture_angr.py` 对三个对象运行 angr 10.0.3。CLE 使用 ELF 后端，将每个可重定位对象加载到 0x400000；`-O0` 应用 13 项重定位，其他级别应用 8 项，并解析四个符号。对带一个符号 64 位参数的 `grade`，`run()` 在 `-O0` 得到 5 个 deadended 状态，在 `-O1`、`-O2` 得到 2 个，耗时分别为 0.475、0.408、0.318 秒。在每个 deadended 状态加入 `eax == v`，询问求解器有符号最小值和最大值，对从 1 到 4 的 `v`，每个级别都得到 60 到 69、70 到 79、80 到 89、90 到 109；返回 0 则得到 -2147483648 到 2147483647。两项交叉检查都为 unsat。

“到达某个块”的形式先对 `-O0` 的 `grade` 运行 CFGFast，列出第 33 课找到的八个块，再用 `explore(find=0x400076)` 寻找存入 4 的块。它在 0.47 秒找到一个状态，另有三个仍 active；参数最小值为 90、最大值为 109，样本为 91、93、94、97、101。

对 `percent_change`，得到两个 deadended 状态，约束分别是 `before[31:0] != 0` 和 `before[31:0] == 0`。要求非零状态满足 `eax == 50`，`-O0` 给出 `before = 21055744, after = 332315210`，`-O1` 给出 `40566804, 834296877`，`-O2` 给出 `-24484867, 993934694`。在 -16 到 16 的有界搜索给出 `before = -10, after = -15`。z3 对第 34 课清单回答同一问题，给出 `before = -25092599, after = 305712160`。测试套件用 IR 求值器计算这五对输入，每对都得到 50。一个模型证明输入存在，并不意味着它是唯一输入。三个正确工具给出了三种不同答案。

`capture_z3.py` 用 32 位位向量对 `-O1` 的 `grade` 清单建模，包含乘法、两次移位和表，再提出四个问题。是否存在某个 32 位 score 使清单不同于源码 `switch`：0.068 秒内得到 unsat，因此编译函数对全部 2^32 个输入都等于源码。是否不同于第 36 课的阈值重建：在 score 706346536 得到 sat，此时 `score / 10` 为 70634653，switch 走默认分支，阈值却返回 4。将同一差异限制在 0 到 109：unsat，因此第 36 课网格看不到它。对 `percent_change`，约束 `before == 3` 且结果为 -133，在 `after = 1073741823` 时 sat，这是第 36 课的溢出单元格；有界搜索在自己的域内找到第二个见证 `after = -1`，此时 `(-1 - 3) * 100 / 3` 向零截断为 -133，完全没有溢出。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution
python3 code/main.py
```

输出是一份 JSON 报告。`diffs` 保存 `-O0` 对 `-O1`、`-O1` 对 `-O2` 的对象文件和加载映像匹配，以及按 BinDiff 顺序比较的 `-O0` 配对。`toolComparison` 对每个函数并列显示本课阶段、radiff2 判定与比率、Ghidra 关联器。`patch` 是 `grade_case10_wrong.o` 案例。`radare2Ratios` 复现 radiff2 数字，`gradeRelocationCase` 显示布局和两个位移，`symbolic` 保存路径、类别和爆炸数量。

按以下顺序阅读 `code/main.py`：

1. `ElfObject` 读取节、符号和 `.rela.*` 记录。`parse_listing()` 读取 `llvm-objdump` 文本。
2. `jump_table_targets()` 和 `build_cfg()` 给出可达块和带类型边。`FunctionRecord.signatures()` 构建五种签名。
3. `load_image()` 布局已分配节，应用 `S + A - P` 和 `S + A`。
4. `match_functions()` 是分阶段匹配器。`levenshtein()` 和 `radare2_ratio()` 给出相似度。
5. `parse_radiff2()` 和 `parse_ghidra_vt()` 读取采集的工具输出以供比较。
6. `evaluate()`、`substitute()` 和 `BoundedSearch` 实现表达式语义和求解器。
7. `execute()` 枚举路径。`solve_returns()` 向每个叶节点查询输入集合。
8. `grade_ir_o0()`、`grade_ir_o1()`、`percent_change_ir_o1()` 和 `total_ir_o1()` 是带原始指令地址的手动提升结果。

还有三个命令。`python3 code/main.py diff A.o B.o` 比较两个旁边存有清单的对象，`--image` 比较其加载映像。`python3 code/main.py paths grade O0` 输出单函数的路径与类别，`paths total 8` 输出带边界的循环。`python3 code/main.py figure-data` 输出交互图嵌入的数据。

## 实际使用

对自己程序的两个构建，按以下顺序使用差异工具和执行器。

1. 为每个对象采集清单，让 `function_record()` 对照字节验证。先修正清单，再做其他事情。
2. 先比较对象文件。阅读每项匹配的阶段；在第二种签名一致前，流图形状匹配只能当作建议。
3. 比较加载映像。从精确字节降为屏蔽字节匹配的函数，相对于数据发生了移动；位移计算能指出移动的是哪个节。
4. 对每项匹配比较引用表。代码相同而常量不同，仍然是函数修改。
5. 运行名称阶段并比较。构建带有符号时，按 BinDiff 顺序运行，只用结构结果评判各阶段。
6. 工具报告比率时，先弄清参与计算的字节，再与自己的结果比较。
7. 对需要求输入的函数，编写每条语句带地址的 IR，限制每个符号循环计数器，再运行 `execute()` 并求解每个叶节点。报告结果时同时报告边界。
8. angr 或 z3 可用时，用相同查询运行它们，比较类别边界。一个样本只是一个模型。

## 交互实验

### 实验 A：手动计算五种签名

从 `code` 目录启动 Python：

```bash
cd phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution/code
python3 -q
```

运行：

```python
from main import *
grade = {r.name: r for r in fixture_records("ledger-x86_64-O1.o")}["grade"]
grade.raw.hex(" ")
grade.masked_bytes() == grade.raw
grade.mnemonics
grade.cfg_shape()
grade.signatures()
```

打印 `grade.raw` 前，先写下函数偏移 0x26 处的四个字节。再对 `ledger-x86_64-O0.o` 的 `grade` 运行相同代码，数一数 `grade.edges` 中的 `table` 边。

### 实验 B：观察重定位如何破坏字节哈希

```python
case = grade_relocation_case()
case["layout"]
case["displacements"], case["rodataShift"]
case["objectBytesEqual"], case["imageBytesEqual"], case["maskedImageBytesEqual"]
```

阅读 `displacements` 前，先在纸上计算 `0x100110 + 0x14 - 0x10003a`。再将 `load_image()` 的基址改为 0x400000，确认位移不变，因为两个操作数一起移动。

### 实验 C：错误匹配，以及避免它的顺序

```python
report = diff_fixtures("ledger-x86_64-O1.o", "ledger-x86_64-O2.o")
[(m.left.name, m.right.name, m.stage) for m in report.matches]
report = diff_fixtures("ledger-x86_64-O0.o", "ledger-x86_64-O1.o")
[(m.left.name, m.right.name, m.stage, m.names_agree) for m in report.matches]
report = diff_fixtures("ledger-x86_64-O0.o", "ledger-x86_64-O1.o", stages=BINDIFF_ORDER)
[(m.left.name, m.right.name, m.stage) for m in report.matches]
```

分别打印 `-O0` 的 `records(...)["percent_change"].cfg_shape()` 与 `-O1` 的 `grade_label` 形状，阅读两个度数序列。再编写第六阶段，对排序后的助记符求哈希，让顺序不再重要，观察它能否将两者区分。

### 实验 D：路径与边界

```python
report = grade_paths("O0")
[(p["trace"], p["condition"], p["returns"]) for p in report["paths"]]
report["returns"]["4"]
total_paths(2), total_paths(4), total_paths(8)
total_paths(64, step_limit=24)["truncated"]
```

将 `SCORE_DOMAIN` 改为 `range(0, 110)`，重新运行 `grade_paths("O0")`。返回 0 的类别缩小为 60 个输入，两项交叉检查仍成立。再将域设为 `range(90, 100)`，查看哪些叶节点完全没有模型。

## 实践实验

对夹具运行 BinDiff，与已有的三种结果比较。

要求：

- 在 Ghidra 12.1.4 中安装 BinExport 扩展，导出三个 ledger 程序。记录 BinExport 发布标签和 Ghidra 版本。
- 安装 BinDiff 8 命令行，以只比较相似度的选项生成 `-O0` 对 `-O1`、`-O1` 对 `-O2` 结果。
- 将各函数相似度与置信度采集到 `code/fixtures/`，并在 `build_fixtures.sh` 中记录精确命令。
- 在 `tool_comparison()` 中增加 `bindiff` 列，添加测试，将 BinDiff 对 `-O1` 与 `-O2` 的匹配集合与本课屏蔽字节集合比较。
- 写一段话，说明 BinDiff 为 `grade` 使用的算法，以及它是否比较加载映像。

成功标准是演示为每个函数输出四个工具列，新测试证明一个相等关系，或说明一个差异。

## 交付产物

本课提供 `outputs/skill-binary-diffing-and-symbolic-execution.md`。用它将两个构建和一个函数转为分阶段差异报告，为每项匹配标明质量，解释每个未匹配或改变的函数，并生成逐叶节点的求解输入集合及其搜索边界的路径报告。

## 验证

运行演示和测试套件：

```bash
cd phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 符号表给出四个函数，`-O0` 的大小为 46、118、66、39，`-O1` 为 16、46、31、63，`-O2` 为 16、46、140、63
- `-O1` 对象的 `.rela.text` 记录描述与 `llvm-objdump -r` 输出一致
- 每条列出指令都在对应符号范围内，字节与对象一致；改变字节会报错
- `-O1` 的 `total` 有五块五边、一个自环，形状字符串具有确定性
- `-O0` 的 `grade` 从 `.rela.rodata` 恢复五个跳转表目标，得到八块十一边
- 没有表时，`-O0` 的 `grade` 只能到达四块中的 82 字节
- `-O0` 的 `percent_change` 与 `-O1` 的 `grade_label` 具有相同四块形状
- 可重定位对象的所有函数中，精确哈希和屏蔽哈希一致
- `-O1` 和 `-O2` 的三个函数字节相同，`-O0` 和 `-O1` 则没有
- `grade` 引用的表读出 `1, 2, 3, 4, 4`，候选对象的表读出 `1, 2, 3, 4, 3`
- 加载器将两份程序的 `.text`、`.rodata`、`.rodata.str1.1` 放在 Ghidra 所用位置
- `R_X86_64_PC32` 按 `S + A - P` 写入并得到位移 122，`.data` 的 `R_X86_64_64` 项写入字符串地址
- `grade` 在对象中字节一致，在映像中因 0x70 的移动而不同，屏蔽后恢复匹配
- `-O1` 对 `-O2` 按精确字节匹配三个函数，按名称匹配 `total`；映像视图通过屏蔽字节匹配 `grade`，相似度为 1 - 1/46
- 本课顺序在 `-O0` 对 `-O1` 中产生一个错误流图形状匹配，BinDiff 顺序则将四个函数全部按名称匹配
- 补丁候选在字节上匹配，在引用数据上不匹配
- Levenshtein 比率复现 0.130435、0.106061、0.269841、0.171429、82 字节上的 0.426829，以及 radiff2 应用重定位后报告的重定位字节比率
- radiff2 的 MATCH 集合等于精确字节阶段，Ghidra 的字节和指令关联器集合分别等于映像视图的精确与屏蔽集合
- Ghidra 在 `-O0` 对 `-O1` 中只找到名称匹配，每项相似度为 1.0，置信度为 10.0
- 手动提升的 IR 恰好覆盖每条列出指令一次，求值器遵循 C 语义
- `grade` 在 `-O0` 中有五条带 switch 条件的路径，在 `-O1` 中有两条路径，类别相同
- 有界类别 60 到 69、70 到 79、80 到 89、90 到 109 与 angr 三个级别及 z3 一致；deadended 状态数为 5 和 2，到达块的范围为 90 到 109
- 两项交叉检查在边界内、angr 或 z3 中都没有模型，z3 证明清单等于源码 switch
- 有界搜索、angr 和 z3 的每个 `percent_change` 模型求值都得到请求值
- `total` 得到 3、5、9 条路径和三角和，与 angr 相同；步数限制返回 22 条、截断 2 条
- 图表数据包含两种视图、重定位数字和五个叶节点及其输入集合，站点模块嵌入相同数据

## 生产环境故障模式

| 故障 | 能力不足的工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 对加载映像求字节哈希 | 两个代码相同的构建间“grade 被修改” | 字段偏移、两个位移和节的移动量；屏蔽哈希匹配 |
| 对可重定位对象求屏蔽哈希 | “屏蔽没有效果” | 字段本来为零；变更藏在重定位记录和引用常量中 |
| 只比较流图形状 | 自信地配对两个无关函数 | 第二种签名一致，或名称矛盾并放弃匹配 |
| 在剥离符号的构建中先匹配名称 | 没有匹配 | 带质量的结构阶段及未匹配列表 |
| 跨工具比较比率 | “radiff2 说 0.43，本课说 0.30” | 各边对哪些字节求指纹：不应用重定位时为 82 字节，应用后为 118 |
| 相同代码，不同常量 | “精确匹配” | 经重定位和边界检查读取的表 |
| 将一个模型当成唯一输入 | “score 是 90” | 类别 90 到 109、数量，以及找到它的搜索边界 |
| 将有界搜索报告为 unsat | “没有输入能得到 -133” | 只在边界内 unsat；z3 在边界外找到 1073741823 |
| 符号循环没有边界 | 超时 | 边界或上限，以及返回、截断和从未开始的路径数 |
| 把未运行的闭源工具描述为已运行 | 没有采集记录的数字 | 带命令和版本的采集文件，或明确说明只依据文档 |

## 操作规则

一次只按一种签名匹配，只接受两边都唯一的值，将阶段和质量与匹配一起保存。比较对象和加载映像，解释每个在两种视图间改变阶段的函数。每个分支都调用求解器来枚举路径，限制每个符号循环，并报告带边界的输入集合。没有边界说明的单个模型只是样本。

## 延伸阅读

- [BinDiff 概念：匹配策略、算法与质量评级](https://github.com/google/bindiff/blob/main/docs/concepts.md)
- [BinDiff 仓库与 v8 开源发布](https://github.com/google/bindiff/releases/tag/v8)
- [BinExport README：IDA Pro、Binary Ninja 和 Ghidra 导出器](https://github.com/google/binexport)
- [Flake, "可执行对象的结构比较" (DIMVA 2004) 与 Dullien, Rolles, "基于图的可执行对象比较" (SSTIC 2005), 随 BinDiff 仓库提供](https://github.com/google/bindiff/tree/main/docs/papers)
- [Diaphora README 与启发式规则源码](https://github.com/joxeankoret/diaphora)
- [Ghidra Version Tracking 关联器帮助页面](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/VersionTracking/src/main/help/help/topics/VersionTrackingPlugin/VT_Correlators.html)
- [Ghidra Auto Version Tracking 帮助页面](https://www.ghidradocs.com/11.0_PUBLIC/help/VersionTracking/help/topics/VersionTrackingPlugin/VT_AutoVT.html)
- [Ghidra 12.1.4 发布](https://github.com/NationalSecurityAgency/ghidra/releases)
- [Binary Ninja 6.0 “Krypton” 发布说明](https://binary.ninja/2026/09/03/binary-ninja-6.0-krypton.html) 与 [Binary Similarity 用户指南](https://docs.binary.ninja/guide/similarity.html)
- [radare2 手册：radiff2](https://book.rada.re/tools/radiff2/intro.html) 与 [radare2 6.2.4 源码](https://github.com/radareorg/radare2/releases/tag/6.2.4)
- [King, "Symbolic execution 与 program testing" (CACM 1976)](https://dl.acm.org/doi/10.1145/360248.360252)
- [Baldoni et al., "符号执行技术综述" (ACM Computing Surveys 2018)](https://dl.acm.org/doi/10.1145/3182657)
- [Cadar, Sen, "用于软件测试的符号执行：三十年后" (CACM 2013)](https://dl.acm.org/doi/10.1145/2408776.2408795)
- [Cadar, Dunbar, Engler, "KLEE: Unassisted 与 Automatic Generation of High-Coverage Tests for Complex Systems Programs" (OSDI 2008)](https://www.usenix.org/legacy/events/osdi08/tech/full_papers/cadar/cadar.pdf) 与 [KLEE 3.2 发布](https://github.com/klee/klee/releases/tag/v3.2)
- [Shoshitaishvili et al., "SoK：战争艺术的现状——二进制分析中的进攻技术" (IEEE S&P 2016)](https://oaklandsok.github.io/papers/shoshitaishvili2016.pdf)
- [angr 文档：加载、模拟管理器与模拟流水线](https://docs.angr.io/en/latest/core-concepts/toplevel.html) 与 [angr 10.0.3 （PyPI）](https://pypi.org/project/angr/)
- [Z3 5.1.0 发布](https://github.com/Z3Prover/z3/releases/tag/z3-5.1.0)
- [Triton 动态二进制分析库](https://github.com/JonathanSalwan/Triton)
- [System V 应用二进制接口，AMD64 架构处理器补充，表 4.9：重定位类型](https://gitlab.com/x86-psABIs/x86-64-ABI)
