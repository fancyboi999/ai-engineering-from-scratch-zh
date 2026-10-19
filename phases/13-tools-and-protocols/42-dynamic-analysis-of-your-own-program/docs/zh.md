# 动态分析自己的程序：调试器、跟踪与静态结论验证

> 命中断点只是对某个构建某次运行的观察。本课构建一个工具，将观察转化为对前面静态分析结论的已确认、已反驳和未观察到三种判定。

**类型：** Build
**语言：** Python, C, arm64 assembly, lldb command language
**前置要求：** 阶段 13 · 33（反汇编与控制流）、阶段 13 · 35（证据、置信度与未知项）
**预计时间：** ~130 分钟

## 学习目标

- 解释调试器在 Linux（`ptrace`）和 macOS（Mach 任务端口、异常端口）需要哪些操作系统能力，以及沙箱 shell 为什么无法启动被调试程序。
- 按名称和列表地址设置软件断点，设置硬件观察点，读取处理器对两者施加的限制。
- 从 Python 以批处理模式驱动 lldb，用停止钩子在每次停止记录寄存器、内存和栈帧变量，再把会话文本解析为时间线。
- 根据时间线检查第 32、33、34、41 课的静态结论：实参寄存器、结构体字段偏移、条件分支采用的边，以及实际发生的调用。
- 对 `-O2` 构建运行相同计划，理解已解析但从未命中的断点，说明它能证明和不能证明什么。
- 保存、加载 core 文件，指出仅栈式 core 遗漏的内容。
- 对照 gdb 与 lldb 命令集，为 `strace`、`ltrace`、`bpftrace`、`dtrace`、`rr` 指定适用系统、版本和许可。
- 说明允许 lldb 调试自己构建二进制的 macOS 代码签名事实，以及拒绝调试时同时成立的两个条件。

## 问题背景

第 41 课从 DWARF 读取 `struct account`，说 `balance` 位于偏移 4。第 33 课构建 `classify` 控制流图，说余额为负时首个分支进入 `return -1` 块。第 32 课说前两个实参位于 `x0`、`x1`。每句话都由字节推导而来，却都还没有被观察。

agent 读取同一程序，报告“main 调用 `bump`、`classify` 和 `sum_balances`”。符号表列出了三者，这句话看似可靠。你以 `-O2` 构建程序，为每个函数设置断点并运行。进程打印四行后退出，每个断点都是 `hit count = 0`。

agent 对源码的判断没错，却答错了被问到的那个构建。编译器内联了三个调用，并将 `sum_balances(rows, 3)` 折叠为常数 315。要知道这个二进制在这台机器上实际如何运行，必须在调试器下运行并观察。

本课构建负责观察的工具。它编译 `account.c`、读取列表、规划一次 lldb 会话、运行，再依据停止状态为每个静态结论判定。结果有三种：`confirmed` 表示某次停止显示结论在本次运行中为真；`refuted` 表示某次停止显示为假；`not-observed` 表示没有停止能够检验它，记录会说明原因。第 35 课随后将每项判定存为权限来源 `controlled-replay` 的 `observed` 记录。

```figure
re-42-run-timeline
```

## 调试器由三类系统服务和一张表组成

调试器对一个代码不属于自身的进程做四件事：停止它，读写寄存器，读写内存，以及在进程再次停止时接收通知。内核分别提供这些服务，不同操作系统的实现不同。

Linux 使用 `ptrace(2)`。手册说，它让一个进程（跟踪者）观察和控制另一进程的执行。`PTRACE_TRACEME` 让子进程声明由父进程跟踪；`PTRACE_ATTACH` 附加无亲缘进程；`PTRACE_PEEKDATA` 读取被跟踪进程地址 addr 的一个字；`PTRACE_GETREGS` 读取寄存器；`PTRACE_SINGLESTEP` 执行一条指令。Yama 模块限制附加：`/proc/sys/kernel/yama/ptrace_scope` 默认值 1 要求目标是调用者后代，2 表示只有管理员可以附加，3 表示任何人都不可以。

macOS 的 `ptrace` 接口较小。Apple 手册列出 `PT_TRACE_ME`、`PT_ATTACHEXC`、`PT_STEP`、`PT_CONTINUE`、`PT_KILL`，并指出 `PT_ATTACHEXC` 将子进程信号作为 Mach 异常交给父进程。内存和寄存器根本不经过 `ptrace`。lldb 的 `debugserver` 调用 `task_for_pid()` 获取进程的 Mach 任务端口，再用 `task_set_exception_ports()` 使断点作为异常消息送达。系统守护进程 `taskgated` 决定谁可调用 `task_for_pid`。

本课保留的会话文本展示了这种设计带来的权限影响。上游实验会话的 shell 运行在 Seatbelt 沙箱内。同一个计划在沙箱外产生十一次停止，在沙箱内则产生：

```text
(lldb) run
error: process exited with status -1 (attach failed ((os/kern) invalid address))
```

进程已创建，但无法接管。错误涉及调试器权限，与程序本身无关。工具将其记录为启动失败，零停止、无判定。

那张表是断点表。调试器记住在哪个地址替换了哪个指令字节，以便继续时放回原字节，并按位置统计命中次数。`breakpoint list` 打印该表，工具在每次运行结束时读取它。

## 断点：替换一个字节或一个字

软件断点把目标指令的开头字节替换为会使处理器陷入异常的指令。x86-64 使用一字节 `INT3`，操作码 `CC`；Intel 手册说明其用于调用调试异常处理器。arm64 使用四字节的 `BRK #imm16`，异常以 EC 值 0x3C 记录到 ESR_ELx。Arm 手册还说明，首选返回地址就是 `BRK` 本身，所以停止报告的是被替换指令地址，而非下一条地址。

lldb 可按名称、文件与行号或地址设置断点。按名称设置会跳过序言：

```text
(lldb) breakpoint set -n bump
Breakpoint 1: where = account-O0`bump + 12 at account.c:13:19, address = 0x00000001000004bc
```

`bump + 12` 是第四条指令。之前三条为 `sub sp, sp, #0x10`、`str x0, [sp, #0x8]`、`str w1, [sp, #0x4]`，是 DWARF 行表归于函数开头行的栈帧设置。停止时 `x0`、`x1` 仍保存实参，因为序言只是复制它们。

按地址设置时，lldb 必须知道地址属于哪个模块。进程尚不存在时，单独的 `breakpoint set -a 0x100000504` 是没有节支撑的加载地址；首次实验中它整次运行都保持 `unresolved`、`hit count = 0`。本工具使用指定模块的形式：

```text
(lldb) breakpoint set -a 0x100000504 -s account-O0
Breakpoint 4: address = 0x0000000100000504
```

加 `-s` 后，该数是 `account-O0` 内的文件地址，lldb 会加上加载滑移；运行后该位置显示 `resolved, hit count = 2`。第 33 课列表给的是文件地址，所以这种形式连接了静态列表与动态停止。

### 手工解码分支

`-O0` 的 `classify` 首个条件分支位于 `0x1000004f0`，指令字为 `36f800a8`，`llvm-objdump` 打印为 `tbz w8, #0x1f, 0x100000504`。按 Arm A64 的 `TBZ` 编码解码。

1. 第 31 位是位编号的高位 `b5`，值为 0。
2. 第 30 至 25 位是 `011011`，即测试并分支组。第 24 位为 0，选择 `TBZ` 而非 `TBNZ`。
3. 第 23 至 19 位是位编号低五位 `b40`：`11111` 即 31。结合 `b5 = 0`，测试的是第 31 位，即 32 位值的符号位。
4. 第 18 至 5 位是 `imm14`：`00000000000101` 即 5。分支偏移 `imm14 * 4` 为 20，即 `0x14`，目标为 `0x1000004f0 + 0x14 = 0x100000504`。
5. 第 4 至 0 位是 `Rt`：`01000` 即 8，所以寄存器是 `w8`。

上一条 `ldr w8, [x8, #0x4]` 加载了 `w8`，对应偏移 4 的 `a->balance`。`TBZ` 在位为零时跳转；符号位清零时采取该边，即 `balance >= 0`。源码写 `if (a->balance < 0) return -1;`，编译器反转了条件：跳转边跳过 `return -1` 块，`0x1000004f4` 的顺序落下边进入该块。所以工具携带的静态结论是带谓词的边结论：`a->balance >= 0` 时跳转，否则顺序落下。第二个分支的提升相同：`subs w8, w8, #0xc8` 计算 `balance - 200`，`b.le 0x100000524` 在结果不大于零时跳转，即 `balance <= 200`。

## 观察点依赖硬件，数量有限

观察点在某地址内存被访问时停止进程。它不能靠替换指令实现，因为任意位置的任意指令都可能访问该地址。因此处理器提供少量地址比较器。x86-64 使用调试寄存器：`DR0` 至 `DR3` 保存最多四个断点地址，`DR7` 启用各项并设置条件（执行、写、读写）及长度（1、2、4、8 字节）。arm64 使用 `DBGWVR<n>_EL1` 保存观察点匹配的数据虚拟地址，以 `DBGWCR<n>_EL1` 控制；Arm 手册说具体实现可包含 2 至 64 个观察点。

lldb 报告其获得的数量：

```text
(lldb) watchpoint set variable a->balance
Watchpoint created: Watchpoint 1: addr = 0x16fdfe00c size = 4 state = enabled type = m
(lldb) watchpoint list
Number of supported hardware watchpoints: 4
```

上游实验机器为四个。观察地址 `0x16fdfe00c` 是 `x0 + 4`，即 `bump` 停止时的结构体指针加 DWARF 的 `balance` 偏移。`size = 4` 对应 `int`，`type = m` 表示修改。槽耗尽时 lldb 拒绝下一个观察点；未对齐或非 2 的幂大小的区域可能占两个槽，因此实际可设置观察点可能少于四个。

数据观察点在访问之后报告。Intel 手册说明，写内存的指令会先覆盖原数据，然后才产生数据断点的调试异常；lldb 自行缓存旧值，才能同时打印两者：

```text
Watchpoint 1 hit:
old value: 250
new value: 255
* thread #1, queue = 'com.apple.main-thread', stop reason = watchpoint 1
    frame #0: 0x00000001000004d0 account-O0`bump(a=0x000000016fdfe008, by=5) at account.c:14:12
```

停止位于 `0x1000004d0`，即 `0x1000004cc` 的 `str w8, [x9, #0x4]` 之后。解析输出前还需知道一个细节：刚执行 `watchpoint set` 后，lldb 会打印 `Watchpoint 1 hit:`，旧值为空，`new value: 250`。这是初始读取，工具忽略没有旧值的命中。

## 单步、停止钩子与批处理

lldb 命令语法是 `<noun> <verb> [-options] [arguments]`。单步动词包括 `thread step-in`（`s`）、`thread step-over`（`n`）、`thread step-inst`（`si`）、`thread step-inst-over`（`ni`）、`thread step-out`（`finish`）。`thread until 12` 运行到指定行，`thread return <expr>` 带值提前返回。本工具不单步，而在规划地址停止，让停止钩子读取状态：

```text
target stop-hook add -o "register read x0 x1 pc" -o "memory read -s4 -fx -c24 $x0" -o "frame variable -P 1"
```

`-o` 可重复，每次停止按顺序运行命令。`register read` 指定两个实参寄存器和程序计数器。`memory read -s4 -fx -c24 $x0` 从 `x0` 地址以十六进制打印 24 个四字节字，共 96 字节，即三个 `struct account` 行。`frame variable -P 1` 打印实参与局部变量，并展开一层指针，使 `a` 显示五个字段。

批处理使用 `lldb -b`。手册说明 `--batch` 运行来自 `-s`、`-S`、`-o`、`-O` 的命令后退出；若命令因信号或崩溃停止，调试器返回交互提示符。工具将计划写入文件，通过 `-s` 传入。重要设置是 `settings set interpreter.stop-command-source-on-error false`。没有它，进程退出后的第一条 `continue` 会终止整个命令文件，`breakpoint list` 不会运行；启用后，lldb 打印 `error: Process must be launched.` 再继续。

输出结构的两个事实决定解析方式。第一，钩子运行时立即打印输出，带 `frame #0` 的 `Process N stopped` 块随后才打印。因此解析器先收集寄存器、内存、变量行到待处理块，遇到下一条 `frame #0` 才将其附上。程序计数器在 `dyld` 的 `_dyld_start` 的块是程序运行前入口停止，没有 `frame #0` 会接收它。第二，使用 `--auto-continue` 的断点完全不报告停止，也不运行停止钩子。本工具初版用了自动继续，结果什么都没记录。因此计划改用普通断点和固定数量的 `continue`。

## 从列表生成计划

`Plan.commands()` 从将要运行的二进制的 `llvm-objdump -d` 文本构建命令文件。对 `account-O0`：

```text
breakpoint set -n bump
breakpoint set -n classify
breakpoint set -n sum_balances
breakpoint set -a 0x100000504 -s account-O0
breakpoint set -a 0x1000004f4 -s account-O0
breakpoint set -a 0x100000524 -s account-O0
breakpoint set -a 0x100000514 -s account-O0
target stop-hook add -o "register read x0 x1 pc" -o "memory read -s4 -fx -c24 $x0" -o "frame variable -P 1"
run
watchpoint set variable a->balance
watchpoint list
continue
...
breakpoint list
watchpoint list -v
```

三个名称断点是函数入口。四个地址断点分别是 `Listing.conditional_branches()` 在 `classify` 找到的每个条件分支的目标与顺序落下地址：`0x1000004f0` 的 `tbz`、`0x100000510` 的 `b.le`。观察点在第一次停止时设置，计划预计此时在 `bump`。后面跟十六条 `continue`，超过任何一次运行所需；退出后多余命令无害失败。这个预算是上限，不是对程序行为的知识。

`claims_for()` 从相同输入构建结论：

| Id | 种类 | 结论 | 来源 |
|---|---|---|---|
| `arg-registers` | argument-register | 每次入口的前几个实参通过 `x0`、`x1` 传入 | 第 32 课与 AAPCS64 |
| `field-offsets` | field-offset | `struct account` 为 32 字节，`kind` 在 0、`balance` 在 4、`code` 在 8、`rate` 在 16、`label` 在 24 | 第 41 课与 DWARF 转储 |
| `branch-1` | branch-taken | `0x1000004f0` 的 `tbz` 在 `a->balance >= 0` 时前往 `0x100000504`，否则到 `0x1000004f4` | 第 33 课的边与第 34 课的提升 |
| `branch-2` | branch-taken | `0x100000510` 的 `b.le` 在 `a->balance <= 200` 时前往 `0x100000524`，否则到 `0x100000514` | 第 33 课的边与第 34 课的提升 |
| `calls` | call-edge | `main` 调用 `bump` 一次、`classify` 三次、`sum_balances` 一次 | 源码文本与 `nm` |
| `store-once` | store | `bump` 写 `a->balance` 一次，新值为旧值加 `by` | 第 34 课伪代码 |
| `stride` | struct-stride | `list[i].balance` 位于 `list + 32*i + 4` | 第 41 课与 psABI 聚合规则 |
| `output` | behaviour | 程序打印 `class 0 1 -1` 和 `sum 315` | 源码算术 |

字段偏移来自 `struct_layout()`：它从 dSYM 转储读取带 `DW_AT_byte_size (0x20)` 的 `DW_TAG_structure_type`，以及五个带 `DW_AT_data_member_location` 的 `DW_TAG_member`。计划没有手写数字 4，而是读取它。

## -O0 运行：十一次停止

第一次是 `bump` 断点。停止块之前，钩子打印：

```text
      x0 = 0x000000016fdfe008
      x1 = 0x0000000000000005
      pc = 0x00000001000004bc  account-O0`bump + 12 at account.c:13:19
0x16fdfe008: 0x00000073 0x000000fa 0x00000009 0x00000000
0x16fdfe018: 0x00000000 0x3ff40000 0x00000719 0x00000001
0x16fdfe028: 0x0000006c 0xffffffd8 0x00000003 0x00000000
0x16fdfe038: 0x00000000 0x40000000 0x00000721 0x00000001
(account *) a = 0x000000016fdfe008 {
  kind = 's'
  balance = 250
  code = 9
  rate = 1.25
  label = 0x0000000100000719 "savings"
}
(int) by = 5
```

按 DWARF 偏移读取首行八个字。偏移 0 的字 0 为 `0x73`，即 `'s'`，是 `kind` 字节，后跟三个填充字节。偏移 4 的字 1 为 `0xfa` 即 250，是 `balance`。偏移 8 的字 2 为 `0x9`，是低半部的 `short code`，高半部为两个填充字节。偏移 12 的字 3 是 8 字节对齐 `double` 前的填充。偏移 16 的字 4、5 组成 `0x3ff4000000000000`，即 1.25 的 IEEE-754 编码。偏移 24 的字 6、7 组成 `0x100000719`，是指向 `__TEXT` 的 `label` 指针。接着八个字以 `0x6c = 'l'` 和 `0xffffffd8 = -40` 开始：这是再晚 32 字节的第三行 `loan`。每个数字都与 `frame variable` 一致，因此 `_check_layout()` 在此停止将 `field-offsets` 记为 `confirmed`；十一次停止中，每当 `x0` 保存结构体指针，它都会再检查一次。

`x0` 等于 `a`，`x1` 等于 `by`，所以此入口确认 `arg-registers`。工具只比较声明的实参。在 `classify` 停止时，`x1` 仍为 `0x5`，是 `bump` 的遗留值；`classify` 只有一个实参，不会拿它作比较。没有实参占用的寄存器只是噪声，第 32 课的结论不涉及它。

第二次是观察点，旧值 250、新值 255、`by = 5`。整次运行只命中一次，所以 `store-once` 确认。然后三次进入 `classify`，每次包含入口停止和一或两次边停止：

| 停止 | 地址 | 原因 | 检验内容 |
|---|---|---|---|
| 2 | `0x1000004e8` | breakpoint 2.1 | 入口，`a->balance = 100`，`x0 = a` |
| 3 | `0x100000504` | breakpoint 4.1 | `tbz` 跳转，100 >= 0，确认 `branch-1` |
| 4 | `0x100000524` | breakpoint 6.1 | `b.le` 跳转，100 <= 200，确认 `branch-2` |
| 5 | `0x1000004e8` | breakpoint 2.1 | 入口，`a->balance = 255` |
| 6 | `0x100000504` | breakpoint 4.1 | `tbz` 跳转，255 >= 0 |
| 7 | `0x100000514` | breakpoint 7.1 | `b.le` 顺序落下，255 > 200 |
| 8 | `0x1000004e8` | breakpoint 2.1 | 入口，`a->balance = -40` |
| 9 | `0x1000004f4` | breakpoint 5.1 | `tbz` 顺序落下，-40 < 0 |
| 10 | `0x100000544` | breakpoint 3.1 | `sum_balances` 入口，`x1 = 3` |

`_check_branches()` 将停止按函数激活分组，在入口读取余额，为每个边停止计算提升谓词预测的后继。五次边停止全部一致：`branch-1` 确认三次，`branch-2` 两次。停止 5 的余额为 255，正是观察点看到的写入值。一次程序运行中的证据彼此相连。

停止 10 的钩子从 `list` 读取 24 个字。`_check_stride()` 取字 1、9、17，即偏移 4、36、68，值为 100、255、-40。它将每项与 `classify` 在同一地址看到的余额比较，求和得 315，再与程序打印的 `sum 315` 比较。然后进程以 0 退出，`breakpoint list` 显示名称命中数 1、3、1，四条边命中数 2、1、1、1。八项结论最后均为 `confirmed`，背后有 25 条记录，23 条关联停止，两条关联已结束运行。

## -O2 运行：零次停止

同一源码在 `-O2` 下成为不同的程序。`main` 的 `llvm-objdump -d` 有四条 `bl`，全部指向 `printf`。原本调用的位置换成 `mov w8, #-0x1`、`mov w8, #0x1`、经 `xzr` 写入的零，以及 `mov w8, #0x13b`，即 315。编译器在编译时算好了每个结果。`nm` 仍列出 `_bump`、`_classify`、`_sum_balances`，因为它们是外部函数，必须保留非内联副本供其他目标文件调用。dSYM 有四个函数的 `DW_TAG_subprogram`，却没有任何 `DW_TAG_inlined_subroutine`，所以调试信息也没记录内联。

该构建计划含三个名称断点，没有边断点。`-O2` 的 `classify` 只有六条指令：`ldr`、`cmp`、`cset`、`cmp`、`csinv`、`ret`，没有条件分支。`-O0` 列表的边结论在此二进制中没有地址，工具不会搬过来。边结论属于列表里实际存在该边的构建。

运行如下：

```text
(lldb) breakpoint set -n bump
Breakpoint 1: where = account-O2`bump at account.c:13:16, address = 0x0000000100000460
(lldb) run
sizeof 32 align 8
offsets 0 4 8 16 24
class 0 1 -1
sum 315
Process 48444 exited with status = 0 (0x00000000)
(lldb) watchpoint set variable a->balance
error: Command requires a process which is currently stopped.
(lldb) breakpoint list
1: name = 'bump', locations = 1, resolved = 1, hit count = 0
```

每个断点都成功解析。地址存在，符号存在，lldb 在那里写了 `BRK`。命中为零是因为没有指令取指到达该地址。判定如下：

| 结论 | 判定 | 记录 |
|---|---|---|
| `calls` | refuted | 完整运行退出码 0 后，入口停止数 bump 0、classify 0、sum_balances 0 |
| `output` | confirmed | 四行输出，退出码 0 |
| `arg-registers` | not-observed | 没有停止能检验它，命中全为 0 |
| `field-offsets` | not-observed | 没有停止能检验它 |
| `store-once` | not-observed | 未在 bump 停止，因此从未设置观察点 |
| `stride` | not-observed | 未在 sum_balances 停止 |

要准确说明反驳范围。结论是 `main` 在该程序中调用三个函数；对这个构建、这次运行，它没有。工具还检查运行已结束，因为退出前命中为零只能说明尚未到达调用。结论没有说函数是死代码，运行也没有这样证明：它们是导出函数，其他目标文件仍可调用。其余四项既未确认也未反驳。此构建的结构体 `balance` 仍在偏移 4，`-O2` DWARF 也这样记录，但本次运行没有停止读取内存证明它。`not-observed` 保留区别，第 35 课持续保留未知项，直到有运行真正观察它。

## Core 转储

core 文件将进程内存和寄存器写入磁盘，使调试器在程序消失后仍可读取停止状态。Apple `core(5)` 说明，少量导致异常终止的信号会将进程内存状态记录到 `/cores/core.pid`，前提是目录存在且终止进程对其有写权限。上游实验机器 `sysctl` 报告 `kern.coredump: 1`、`kern.corefile: /cores/core.%P`，`/cores` 存在，模式为 `drwxrwxr-t root admin`，shell 的 `ulimit -c` 为 0。提高到 `ulimit -c unlimited`，或通过 `launchctl limit core unlimited` 全局提高前，内核不会写 core。

lldb 无需崩溃也可按需写 core。在 `bump` 断点：

```text
(lldb) process save-core --style stack account-O0-stack.core
Saving 49152 bytes of data for memory region at 0x16fdf4000

Modified-memory or stack-memory only corefile created.  This corefile may 
not show library/framework/app binaries on a different system, or when 
those binaries have been updated/modified. Copies are not included
in this corefile.  Use --style full to include all process memory.
```

文件大小为 53,248 字节。加载它还需要二进制：

```text
(lldb) target create "./account-O0" --core "account-O0-stack.core"
(lldb) bt
* thread #1, stop reason = ESR_EC_BRK_AARCH64 (fault address: 0x0)
  * frame #0: 0x00000001000004bc account-O0`bump(a=0x000000016fdfe008, by=5) at account.c:13:19
    frame #1: 0x0000000100000640 account-O0`main at account.c:40:5
    frame #2: 0x000000019a949d54 dyld`start + 7184
(lldb) frame variable *a
(account) *a = (kind = 's', balance = 250, code = 9, rate = 1.25, label = "")
(lldb) frame variable a->label
(const char *) a->label = 0x0000000100000719 ""
```

回溯和整数字段完整，因为它们位于 core 保存的栈上。`label` 打印为空字符串，但指针完整。`0x100000719` 指针正确，它指向可执行文件 `__TEXT` 段内字面量 `"savings"`，而仅栈式 core 不含该段。指针是观察值，字符串不可用，lldb 不会编造。`--style full` 包含全部进程内存；研究机器上这个 34 KB 程序的完整 core 为 2.1 GB，因为进程映射共享缓存。停止原因是 `ESR_EC_BRK_AARCH64`：core 记录了断点产生的 `BRK` 异常。

Linux 内核依据 `/proc/sys/kernel/core_pattern` 写 core，模板中 `%p` 为 PID，`%e` 为命令名，`%s` 为信号，`%t` 为时间，开头 `|` 将转储送入程序管道。systemd 发行版用该管道交给 `systemd-coredump`，用 `coredumpctl list`、`info`、`dump`、`debug` 取回记录。`gdb prog core`、`lldb -c core prog` 都能打开结果。

## gdb 与 lldb 对照

两种调试器做相同工作，使用不同词汇。工具的 `COMMAND_MAP` 有 35 行，由 `python3 code/main.py commands` 打印。本课使用的命令如下：

| 任务 | gdb | lldb | lldb 别名 |
|---|---|---|---|
| 在函数断点 | `break bump` | `breakpoint set -n bump` | `b bump` |
| 在模块内地址断点 | `break *0x1000004f0` | `breakpoint set -a 0x1000004f0 -s account-O0` | |
| 每次停止运行命令 | `define hook-stop` ... `end` | `target stop-hook add -o '...'` | |
| 列出断点与命中数 | `info breakpoints` | `breakpoint list` | `br l` |
| 观察变量写入 | `watch a->balance` | `watchpoint set variable a->balance` | `wa s v a->balance` |
| 列出观察点 | `info watchpoints` | `watchpoint list -v` | `wa l -v` |
| 读取一个寄存器 | `p $x0` | `register read x0` | |
| 按字读取内存 | `x/8xw 0x16fdfe008` | `memory read -s4 -fx -c8 0x16fdfe008` | `x -s4 -fx -c8 0x16fdfe008` |
| 显示实参 | `info args` | `frame variable --no-locals` | |
| 执行一条指令 | `stepi` | `thread step-inst` | `si` |
| 运行到函数返回 | `finish` | `thread step-out` | `finish` |
| 写 core 文件 | `gcore core` | `process save-core --style stack core` | |
| 打开 core 文件 | `gdb account-O0 core` | `lldb -c core account-O0` | |

lldb 的 `p` 是 `dwim-print` 别名，普通变量通过 `frame variable` 路径打印，其他内容回退到 `expression`。`v` 是 `frame variable`。工具中优先用 `frame variable`：它读取 DWARF 位置，从不在被调试程序中执行代码。

以下版本与许可信息来自上游 2026-10-14 的记录。lldb 使用 LLVM 版本号，当时 llvm.org 版本为 2026-10-06 的 LLVM 23.1.3，许可为附 LLVM 例外的 Apache License 2.0。Homebrew 以独立 formula `lldb` 提供。实验机器 Command Line Tools 提供 Apple 自有编号的 `lldb-1703.0.236.21`，内嵌 Python 3.9.6，已签名可调试。GDB 18.1 于 2026-09-25 发布，许可 GPL-3.0-or-later，发布说明列出 Windows、`.gdb_index`、AArch64 `FPMR`、Python `gdb.Corefile` 变化，没有 Darwin 条目。到 18.1，GDB 仍不原生支持 Apple silicon 进程：2025 年 10 月发布过含 15 个补丁的“Initial AArch64-Darwin support”，2026 年 2 月维护者说明需先完成版权转让和 BFD 补丁才能合入。Homebrew `gdb` 有 arm64 bottle，构建时伪设 `--target=x86_64-apple-darwin20`，引入它们的 PR 明言无法通过 GDB 调试 aarch64-darwin 二进制。macOS 上非 Apple 调试器还需自签证书和 `com.apple.security.cs.debugger` 权限，否则 `task_for_pid` 报 `(os/kern) failure (0x5)`。本课程把 gdb 放在 Linux：Debian stable 为 arm64 提供 gdb 16.3，`rr` 也运行在那里。

## 跟踪：程序向内核请求了什么

调试器展示停止时的状态，跟踪器则在不长时间停止程序的情况下展示程序对系统的影响。工具按操作系统区分。

| 工具 | 系统 | 版本 | 许可 | 记录内容 |
|---|---|---|---|---|
| `strace` | Linux | 7.2，2026-08-18 | LGPL-2.1-or-later | 系统调用、实参和返回值 |
| `ltrace` | Linux | 最后 tarball 为 0.7.3，Debian 使用 git 快照 | GPL-2.0 | 动态库调用 |
| `bpftrace` | Linux | v0.27.0，2026-09-10 | Apache-2.0 | 经 eBPF 的内核与用户探针 |
| `dtrace`、`dtruss` | macOS | macOS 26.2 的 `Sun D 1.19` | Sun OpenSolaris 的 CDDL | D 探针；`dtruss` 打印系统调用 |

`dtruss` 手册说明，因使用 DTrace，只有 root 可运行。Apple `dtrace(1)` 补充，默认 SIP 设置不允许 D 程序访问内核地址值或内核内存，也不允许破坏性动作。本课未在上游实验机器运行 `sudo dtruss ./account-O0`，因为工具无需 root 运行，该项记录为未验证。跟踪回答的问题不同：“本次运行是否为每行 `printf` 发出了 `write`”属于跟踪问题，“`bump` 入口的 `x1` 是否为 5”属于调试问题。两者都只针对一次运行。

## 记录与重放

`rr` 记录一次运行，在 gdb 下确定性重放并支持反向执行：为关心的值设置观察点，`reverse-cont` 会倒退到写入。项目将其描述为记录一次失败，再任意次确定性调试该记录。上游记录的当前版本为 2025-02-13 的 5.9.0，主体许可 MIT，含 BSD-2-Clause 部分。它仅支持 Linux，依赖硬件性能计数器统计分支，因此可运行于 Intel Nehalem 及后续处理器、部分 AMD Zen，以及 Linux 下某些 AArch64 微架构，例如 ARM Neoverse N1 和 Apple Silicon M 系列。虚拟机内必须虚拟化计数器；项目 wiki 指出 Mac 上其他虚拟化方案也不提供，因此上游实验机器的 Docker、Colima 不能运行它。Pernosco 是基于 rr 记录的商业服务。

gdb 有自己的软件记录器。`record full` 保存进程执行日志，默认上限 200,000 条指令；`record btrace` 使用 Intel 分支跟踪，不记录数据。lldb 都不支持。本 macOS 实验中，保存的会话文本就是记录：同二进制、同计划产生同顺序停止，fixture 测试固定该顺序。

## 一次运行能证明什么

一次运行只证明一个构建上的一个输入。C 标准将未定义行为定义为：使用不具可移植性或错误的程序结构、或错误数据时，标准不施加要求的行为。因此有符号 `int` 溢出的程序在 `-O0`、`-O2` 完全可能打印不同结果。第 36 课在 `percent_change` 溢出单元遇到过此事。UBSan 可将问题变成停止：`-fsanitize=signed-integer-overflow -fsanitize-trap=undefined` 使溢出执行陷阱指令，在 lldb 中产生带原因的停止。

优化也会移动想观察的内容。GDB 手册指出，优化器重排代码，调试器展示实际存在的内容；被优化掉的变量是 GDB 从未看见的。GDB 将其打印为 `<optimized out>`，源码将它与 `<unavailable>` 区分：前者在程序中实际不存在，后者在机器层面存在，但 GDB 无法取得。程序计数器不在变量 DWARF 位置列表的任何范围内时，lldb 打印 `<variable not available>`。常驻寄存器的局部变量的内存观察点不会触发，因为寄存器不是内存。前述 `-O2` 展示极端情况：整个函数调用被折叠，从未设置的观察点保持沉默，什么也证明不了。

因此工具只写三种记录，不写第四种。停止检验结论且一致为 `confirmed`；检验但不一致为 `refuted`；没有停止能检验为 `not-observed`，须附原因，断点命中数属于原因的一部分。第 35 课台账将前两种作为来源 `controlled-replay` 的 `observed` 记录，第三种保留为开放未知项。

## 在 macOS 只调试自己的构建

Apple silicon 的链接器会自动签名。Apple `ld(1)` 对 `-adhoc_codesign` 说明，Apple Silicon 二进制默认使用 ad-hoc 代码签名。对 fixture 执行 `codesign -dvvv account-O0` 打印：

```text
Format=Mach-O thin (arm64)
CodeDirectory v=20400 size=387 flags=0x20002(adhoc,linker-signed) hashes=9+0 location=embedded
Signature=adhoc
TeamIdentifier=not set
```

`0x20002` 是 `CS_ADHOC`（`0x2`）加 `CS_LINKER_SIGNED`（`0x20000`），Apple 代码签名头将后者定义为链接器自动签名。`codesign -d --entitlements -` 在可执行文件名称后无输出，即二进制没有 entitlements。lldb 成功启动、命中所有断点、设置硬件观察点并写出 core，而 `DevToolsSecurity -status` 报告开发者模式禁用，SIP 也启用。

两个权限分别位于两侧，控制谁能调试什么。`com.apple.security.cs.debugger` 属于调试器，布尔值表示应用是否为调试器，能否附加其他进程或取得任务端口。Apple `debugserver` 携带私有形式，Command Line Tools 版本的 `codesign -d --entitlements -` 列出 `com.apple.private.cs.debugger`、`com.apple.private.set-exception-port`、`com.apple.private.thread-set-state`、`com.apple.private.logging.diagnostic`。`com.apple.security.get-task-allow` 属于目标。Xcode 将它注入 debug 构建，导出时删除，公证会拒绝仍携带它的二进制。Apple 工程师给出的拒绝条件是：目标启用 hardened runtime，且没有 `get-task-allow`。普通 `clang` 构建未加固，不会同时触发这两个条件。若曾以 `codesign --options runtime` 签署自己的 fixture，调试前可用 `codesign -s - -f --entitlements get-task-allow.plist` 重新签名。

最后三个事实：第一，登录会话首次使用时可能出现“Developer Tools Access needs to take control of another process for debugging to continue”对话框；`sudo DevToolsSecurity -enable` 可取消 `admin` 或 `_developer` 组成员的额外密码要求。第二，调试自己的代码无需禁用 SIP。Apple 明确说明运行、调试 Xcode 应用无需关闭 SIP；唯一涉及调试的 SIP 组件是 `csrutil enable --without debug` 放宽的、针对他人进程的限制。第三，上游会话的 Seatbelt 沙箱完全阻止 `task_for_pid`，fixture `sandbox-O0.lldb.txt` 展示了结果。运行不能启动是环境事实，工具会据此报告。

本课所有内容只适用于你自己编译的程序。相同命令只有在其他进程的所有者选择允许时才可附加，本课不讲如何改变其选择。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program
python3 code/main.py
```

输出是一份基于保存会话文本的 JSON 报告。对每个构建，列出断点解析状态和命中数、硬件观察点数量、各停止的寄存器与实参、退出码、程序输出、lldb 错误，以及各结论的判定和证据记录。另附 core 往返、Python API 结果、沙箱失败，以及上游实验机器缺少哪些外部工具。

预期结构：

```json
{
  "program": "account.c",
  "variants": {
    "O0": {
      "binary": "account-O0",
      "breakpoints": {"1": {"spec": "name=bump", "address": "0x1000004bc", "resolved": true, "hits": 1}, "...": "..."},
      "hardwareWatchpoints": 4,
      "watchpoints": {"1": {"address": "0x16fdfe00c", "size": 4, "type": "m", "hits": [[250, 255]], "hitCount": 1}},
      "stops": [{"index": 0, "pc": "0x1000004bc", "function": "bump", "kind": "entry", "registers": {"x0": "0x16fdfe008", "x1": "0x5"}, "...": "..."}],
      "exitStatus": 0,
      "claims": [{"id": "arg-registers", "verdict": "confirmed", "confirmed": 5, "refuted": 0, "not-observed": 0, "...": "..."}],
      "evidence": [{"claim": "arg-registers", "verdict": "confirmed", "stop": 0, "observation": "bump: x0 = 0x16fdfe008 and a = 0x000000016fdfe008, x1 = 0x5 and by = 5"}]
    },
    "O2": {"stops": [], "claims": [{"id": "calls", "verdict": "refuted", "...": "..."}], "...": "..."}
  },
  "core": {"savedAt": {"function": "bump", "pc": "0x1000004bc"}, "labelString": "", "...": "..."},
  "types": {"python": "3.9.6", "size": 32, "...": "..."},
  "sandbox": {"stops": 0, "errors": ["process exited with status -1 (attach failed ((os/kern) invalid address))"]},
  "absentTools": ["bpftrace", "gdb", "llvm-objdump", "ltrace", "rr", "strace"]
}
```

按以下顺序阅读 `code/main.py`：

1. `Listing` 将 `llvm-objdump -d` 解析为函数和指令，`Function.conditional_branches()` 找到分支及目标、顺序落下地址。
2. `struct_layout()` 从 `llvm-dwarfdump` 文本读取结构体和成员条目。
3. `lift_condition()` 将一个条件分支变为谓词，对应第 34 课对 `tbz`、`cbz`、比较并分支形式的提升。
4. `Plan.commands()` 从列表生成 lldb 命令文件，`Plan.lldb_command()` 给出批处理调用。
5. `parse_transcript()` 按顺序遍历输出，构建带寄存器、内存、变量和观察点值的 `Stop`，并记录断点表、退出码。
6. `claims_for()` 声明八项结论，`evaluate()` 用 `_check_*` 函数逐停止判定。
7. `rollup()` 将记录归约为每结论一个判定，refuted 优先于 confirmed。
8. `capture()`、`capture_extras()` 生成 fixture；当 `clang`、`lldb` 可运行时，`live()` 对新构建重复完整流程。

另有四个命令。`python3 code/main.py plan O0` 打印构建命令文件。`python3 code/main.py commands` 打印 gdb 与 lldb 表。`python3 code/main.py tools` 报告 `PATH` 上有哪些外部工具。`python3 code/main.py live O0` 将 `account.c` 编译到临时目录，从新列表规划、运行 lldb，并按本次运行判定。在沙箱内会报告 lldb 无法启动进程及其错误，以 1 退出。

## 实际使用

对自己的程序按以下顺序使用工具。

1. 用 `-g` 和实际交付的优化级别构建。将二进制、dSYM 或 DWARF、`llvm-objdump -d` 文本保存在一起。
2. 运行前写结论。每项指定函数、寄存器或地址或偏移、预期值或边，以及来源课程或文档。看到停止后再写的结论只是描述停止，不构成检验。
3. 从列表生成计划并阅读。每个地址都应能追溯到列表一行，没有来源行的断点应删除。
4. 批处理运行一次，保存会话文本，头部记录命令行与调试器版本。会话文本是证据，判定由它派生，任何人都可重新推导。
5. 判定。先读每个 `not-observed` 及原因，再读确认结果。原因说明哪些结论需要其他输入、构建或断点。
6. 用相同结论运行优化构建。内联位置可能断点已解析却零命中，这些结论仍保持开放。
7. 将确认和反驳记录写入第 35 课台账，类型为 `observed`，来源 `controlled-replay`，每次停止一条记录。未观察项保留为未知，并附断点命中数。

## 交互实验

### 实验 A：手工读一次停止

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/code
python3 -q
```

运行：

```python
from main import *
t = load_transcript("session-O0.lldb.txt")
s = t.stops[0]
hex(s.pc), s.function, s.reason, s.registers
[hex(w) for w in s.memory[:8]]
s.struct_pointer().fields
```

第二行之前，先写下预计哪个字保存 250，哪两个字保存 1.25。再运行 `struct.unpack("<d", struct.pack("<II", s.memory[4], s.memory[5]))` 比较。随后查看 `t.stops[1].watch_hit` 和 `t.stops[1].pc`，在 `account-O0.objdump.txt` 找到该地址：它是存储后的指令。

### 实验 B：分支与后继

```python
plan = make_plan("O0")
plan.branches()
classify = plan.listing.function("classify")
[lift_condition(classify, b, "a->balance")[0] for b in plan.branches()]
[(hex(s.pc), s.struct_pointer().field_int("balance")) for s in t.stops_in("classify")]
```

将每次边停止与入口停止配对，在看证据前，先决定谓词预测哪个后继。再运行 `[e.to_dict() for e in evaluate(plan, t, struct_layout(open("fixtures/account-O0.dwarfdump.txt").read(), "account")) if e.claim.startswith("branch")]` 比较。

### 实验 C：从未停止的运行

```python
o2 = load_transcript("session-O2.lldb.txt")
len(o2.stops), o2.exit_status, o2.hits()
o2.errors[:3]
make_plan("O2").branches()
rollup(evaluate(make_plan("O2"), o2, struct_layout(open("fixtures/account-O2.dwarfdump.txt").read(), "account")))
```

用自己的话解释每个 `not-observed`，再打开 `account-O2.objdump.txt`，找出 `main` 中替代调用的四个常数。然后用 `count_tags()` 统计 `account-O2.dwarfdump.txt` 的 `DW_TAG_inlined_subroutine`。

### 实验 D：破坏证据

```python
text = open("fixtures/session-O0.lldb.txt").read().replace("x1 = 0x0000000000000005", "x1 = 0x0000000000000006", 1)
broken = parse_transcript(text)
[e.to_dict() for e in evaluate(plan, broken, struct_layout(open("fixtures/account-O0.dwarfdump.txt").read(), "account")) if e.claim == "arg-registers"][:2]
```

改一个寄存器就使第一条 `arg-registers` 和汇总结果变为 `refuted`，其余四条入口记录仍为 `confirmed`。再删除观察点停止前的 `old value: 250`，观察 `store-once` 降为 `not-observed`。无法被故意改坏的判定器并未真正判定。

若 lldb 能在你的 shell 启动进程，最后运行 `python3 main.py live O0` 和 `python3 main.py live O2`。栈地址会与 fixture 不同，判定不应改变。

## 实践实验

为 `sum_balances` 循环扩展一项结论。

要求：

- 在 `-O0` 列表中用 `conditional_branches()` 找到 `sum_balances` 回边，在循环头加断点。
- 添加结论：`count = 3` 时，循环头执行 `count + 1` 次，对应第 33 课的回边加退出测试。
- 扩展停止钩子或计划，每次循环头停止都读取计数器栈槽，写 `_check_loop()` 记录计数器序列。
- 在 lldb 可启动的机器用 `python3 main.py capture O0` 重新捕获会话，再运行测试。在提交的命令文件与新计划匹配前，计划测试会失败，这正是它的目的。
- 添加测试，编辑一个会话计数器值，断言结论变为 `refuted`。

成功标准：报告按顺序显示循环头停止及计数器值；`-O2` 对新结论保留 `not-observed`，原因为循环已向量化或被折叠消除。

## 课程产物

本课提供 `outputs/skill-dynamic-analysis-of-your-own-program.md`。用它将自己构建的程序、列表和静态结论列表转换为一份保存的调试会话文本，以及每结论一个判定，附产生判定的停止，以及每个未观察结论的原因。适用于 Claude、Cursor、Codex、OpenClaw、Hermes 或任何能读取 SKILL.md 的 agent。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

套件无需 lldb，读取预先捕获到 `code/fixtures/` 的会话。验证应证明：

- 列表解析器找到四函数及范围，以及 `-O0` 的 `classify` 两个条件分支及目标、顺序落下地址
- `tbz w8, #0x1f` 提升为 `a->balance >= 0`，`subs` 加 `b.le` 提升为 `a->balance <= 200`
- `-O0` 的 `main` 调用 `bump`、三次 `classify`、`sum_balances`，`-O2` 的 `main` 只调用 `printf`
- x86-64 `j<cc>` 是条件指令，`jmp`、`callq` 不是
- DWARF 转储给出 32 字节结构体，成员在 0、4、8、16、24
- `-O2` DWARF 有四个子程序，零内联子程序条目，`nm` 仍列出三个函数
- 两个构建的计划都等于提交的命令文件，会话头记录执行它的 lldb 命令
- `-O0` 会话在预期函数含十一次停止，退出码 0，输出四行
- 钩子输出附到后一个停止，`x1 = 5`，内存从 `x0` 开始，并包含 label 字符串
- 断点表记录解析状态与命中数 1、3、1、2、1、1、1
- 观察点位于 `x0 + 4`，大小四字节、类型 modify，命中一次，旧值 250、新值 255，报告四个硬件槽
- `-O2` 会话零停止，三个断点已解析但零命中，无观察点，每个多余 `continue` 产生一个错误
- 沙箱启动在任何停止之前以附加错误失败
- core 往返保留回溯和 `balance = 250`，丢失 `label` 指向的字符串
- Python API 无需进程即可读取五个字段、大小 32 和函数范围
- 手写 x86-64 会话可用 `rdi`、`rsi`、`rip` 解析
- `-O0` 的所有结论都确认，记录数分别为 5、11、3、2、1、1、1、1
- 分支证据给出值、条件与边
- 字段偏移证据通过 DWARF 布局解码各字
- 存储和步长证据携带旧值、新值及三行余额
- `-O2` 运行反驳调用边，其余结论保持未观察
- 编辑寄存器值会反驳，删除观察点命中会未观察，反驳优先于其他汇总结果
- 命令映射每行都有 gdb、lldb 形式，硬件表列出四个 x86 调试寄存器
- 演示列出缺失工具而非失败，live 模式按名称报告缺失工具
- 图表数据来自两个会话，站点模块内嵌相同数据

## 生产中的失败模式

| 失败 | 较弱报告的说法 | 工具必须证明的内容 |
|---|---|---|
| 断点已解析但零命中 | “函数运行了”或“函数是死代码” | 完整运行、退出码、命中数，仅反驳调用边 |
| 在错误停止读取寄存器 | “classify 内 `x1 = 5`” | 只在入口比较声明的实参 |
| 不按偏移读取结构体 | 一列十六进制字 | 将每个字映射到 `DW_AT_data_member_location`，与 `frame variable` 比较 |
| 根据助记符判定分支 | “tbz 表示负数时跳转” | 从编码提升的谓词，以及后继地址的停止 |
| 对寄存器局部变量设观察点 | “没有发生写入” | 观察点确实设置到地址并命中，否则记 `not-observed` |
| 自动继续断点 | 干净但没有停止的会话 | 普通断点、停止钩子和继续预算 |
| 地址断点不带模块 | `unresolved, hit count = 0` | `-s MODULE` 使列表地址解析为加载地址 |
| 首个错误终止批处理 | 结尾没有 `breakpoint list` | `interpreter.stop-command-source-on-error false` |
| 将仅栈式 core 当完整内存 | 把 `label = ""` 当程序实际值 | core 类型、指针及其指向段 |
| 沙箱 shell | “lldb 坏了” | 将 `attach failed ((os/kern) invalid address)` 记录为环境事实 |
| 加固目标缺少 `get-task-allow` | “macOS 禁止调试” | Apple 规则的两个条件，并对自己的二进制重新签名 |
| 判定后丢弃会话文本 | 判定没有来源 | 会话文件、命令行、调试器版本 |

## 操作准则

从列表规划停止，批处理运行一次，保留会话文本，在每个能检验结论的停止逐项判定。只有停止证据才能确认或反驳；未观察必须附命中数和原因；绝不以断点成功解析代替实际运行。只调试自己的构建。

## 延伸阅读

- [LLDB Tutorial: command grammar, breakpoints, watchpoints, stop hooks](https://lldb.llvm.org/use/tutorial.html)
- [lldb(1) manual page: --batch, --one-line, --source, --core](https://lldb.llvm.org/man/lldb.html)
- [GDB to LLDB Command Map](https://lldb.llvm.org/use/map.html)
- [LLDB Python Reference: SBTarget, SBFrame, SBValue, 和 the embedded interpreter](https://lldb.llvm.org/use/python-reference.html)
- [LLDB Caveats: the Python build lldb links against](https://lldb.llvm.org/resources/caveats.html)
- [LLVM 23.1.3 release](https://github.com/llvm/llvm-project/releases/tag/llvmorg-23.1.3)
- [GDB 18.1 release announcement, 2026-09-25](https://sourceware.org/pipermail/gdb-announce/2026/000150.html)
- [GDB manual: Process Record 和 Replay](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Process-Record-and-Replay.html)
- [GDB manual: Debugging Optimized Code](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Optimized-Code.html)
- [GDB wiki: Permissions on Darwin, code signing a debugger](https://sourceware.org/gdb/wiki/PermissionsDarwin)
- [gdb-patches: Initial AArch64-Darwin support series, October 2025](https://sourceware.org/pipermail/gdb-patches/2025-October/222196.html)
- [Homebrew gdb formula pull request adding arm64 bottles](https://github.com/Homebrew/homebrew-core/pull/209753)
- [ptrace(2), Linux manual page](https://man7.org/linux/man-pages/man2/ptrace.2.html)
- [lldb debugserver MachTask.mm: task_for_pid 和 task_set_exception_ports](https://github.com/llvm/llvm-project/blob/main/lldb/tools/debugserver/source/MacOSX/MachTask.mm)
- [Intel SDM Volume 2: INT n, INTO, INT3, INT1](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [Intel SDM Volume 3: debug registers DR0 to DR7 (Debug, Branch Profile, TSC, 和 Resource Monitoring Features)](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [Arm A64 ISA: BRK, Breakpoint instruction](https://developer.arm.com/documentation/ddi0602/latest/Base-Instructions/BRK--Breakpoint-instruction-)
- [Arm A64 ISA: TBZ, Test bit 和 branch if zero](https://developer.arm.com/documentation/ddi0602/latest/Base-Instructions/TBZ--Test-bit-and-branch-if-zero-)
- [Arm Architecture Reference Manual, D2.9 Watchpoint exceptions](https://developer.arm.com/documentation/ddi0487/latest/)
- [Apple ld(1): -adhoc_codesign](https://keith.github.io/xcode-man-pages/ld.1.html)
- [Apple ld64 LinkEdit.hpp: CS_LINKER_SIGNED](https://github.com/apple-oss-distributions/ld64/blob/59a99ab60399c5e6c49e6945a9e1049c42b71135/src/ld/LinkEdit.hpp)
- [Apple: Debugging Tool Entitlement, com.apple.security.cs.debugger](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.debugger)
- [Apple: Hardened Runtime](https://developer.apple.com/documentation/security/hardened-runtime)
- [Apple: Resolving common notarization issues, the get-task-allow entitlement](https://developer.apple.com/documentation/security/resolving-common-notarization-issues)
- [Apple: Disabling 和 Enabling System Integrity Protection](https://developer.apple.com/documentation/security/disabling-and-enabling-system-integrity-protection)
- [Apple Developer Forums: debugserver may not get the taskport of a hardened process](https://developer.apple.com/forums/thread/127544)
- [Apple DevToolsSecurity(8)](https://keith.github.io/xcode-man-pages/DevToolsSecurity.8.html)
- [Apple core(5)](https://keith.github.io/xcode-man-pages/core.5.html)
- [Apple Technical Note TN2124: Mac OS X Debugging Magic, core dumps](https://developer.apple.com/library/archive/technotes/tn2124/_index.html)
- [lldb `process save-core` help text](https://github.com/llvm/llvm-project/pull/143126)
- [core(5), Linux manual page](https://man7.org/linux/man-pages/man5/core.5.html)
- [coredumpctl(1)](https://man7.org/linux/man-pages/man1/coredumpctl.1.html)
- [Apple dtrace(1)](https://keith.github.io/xcode-man-pages/dtrace.1.html)
- [Apple dtruss(1m)](https://keith.github.io/xcode-man-pages/dtruss.1m.html)
- [strace releases](https://github.com/strace/strace/releases)
- [ltrace](https://ltrace.org/)
- [bpftrace CHANGELOG](https://github.com/bpftrace/bpftrace/blob/master/CHANGELOG.md)
- [rr project](https://rr-project.org/)
- [rr 5.9.0 release](https://github.com/rr-debugger/rr/releases/tag/5.9.0)
- [rr wiki: Building And Installing, hardware 和 VM requirements](https://github.com/rr-debugger/rr/wiki/Building-And-Installing)
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [ISO/IEC 9899:2024 working draft N3220, clause 3.5 undefined behavior](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf)
- [DWARF Debugging Information Format Version 5](https://dwarfstd.org/doc/DWARF5.pdf)
- [Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64)](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement](https://gitlab.com/x86-psABIs/x86-64-ABI)
