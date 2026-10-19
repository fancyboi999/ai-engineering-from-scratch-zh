# 恢复控制流

第 3 阶段，共 8 阶段。应用[反汇编与控制流](../../../../../phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md)中的“递归下降”“基本块”“迭代算法计算支配关系”“-O0 下 grade 的跳转表”，并应用[编译器惯用法与优化](../../../../../phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/docs/zh.md)中的边界检查惯用法。

## 构建内容

为一个函数构建控制流图：

1. `recursive_descent` 只解码从入口可达的字节。
2. 跳转表解析器将 `jmpq *%rax` 转为目标列表，通过重定位定位表，从边界检查取得长度。
3. `ControlFlowGraph` 将指令拆成基本块，边带类型：`jump`、`taken`、`fallthrough`、`table`。
4. 计算逆后序、直接支配节点、支配边界、后支配节点、回边和自然循环。

## 为什么重要

线性扫描把对齐填充当作代码解码。递归下降只解码可能执行的内容，但遇到间接跳转就停下，除非知道跳转目的地。测试固件中，信息来自加载表基址的 `lea` 重定位以及表内重定位。

支配关系是后续阶段的输入。SSA 在支配边界插入 phi（阶段 4）。回边指向支配源节点的块，阶段 7 生成的每个循环都从回边开始。分支的直接后支配节点是两条分支重新汇合处，阶段 7 用它闭合 `if`。

## 具体案例

`-O0` 的 `band` 占据 0x50 到 0xba，之后有 6 字节填充直到 0xc0。

没有解析器时，从 0x50 递归下降解码 16 条指令。沿 0x62 的 `ja` 到默认块 0xae，沿顺序路径到 0x64，在 0x76 的 `jmpq *%rax` 停下。该跳转列入 `unresolved`，六个 case 块永远不会到达。

解析器从跳转向前追溯：

| 地址 | 指令 | 作用 |
|---|---|---|
| 0x5e | `subq $0x5, %rax` | 与 5 比较的边界检查 |
| 0x62 | `ja 0xae` | 越界进入 default |
| 0x68 | `leaq (%rip), %rcx` | 表基址，重定位 `.rodata-0x4` 解析为 `.rodata+0x0` |
| 0x6f | `movslq (%rcx,%rax,4), %rax` | 加载 4 字节有符号表项 |
| 0x73 | `addq %rcx, %rax` | 表项加基址 |
| 0x76 | `jmpq *%rax` | 间接跳转 |

边界检查允许索引 0 到 5，因此表有 6 项。每项在 `.rodata` 中都有针对 `.text` 的重定位。第 i 项位于 `.rodata+4i`，目标为 `addend + (table base - entry offset)`：0x78、0x81、0x8a、0x93、0x9c、0xa5。带解析器的下降解码 28 条指令，同范围线性扫描解码 29 条，因为还解码了 `nopw` 填充。

图有 10 个块、15 条边，其中六条为 `table`。每个 case 块的直接支配节点是含跳转的 0x64 块。默认块 0xae 和返回块 0xb5 的直接支配节点是 0x50，因为默认和 case 路径都能到达。入口的直接后支配节点为 0xb5。

`-O1` 下同一个 `switch` 没有间接跳转。clang 用 `movl (%rcx,%rax,4), %eax` 从值表加载结果。`find_value_tables` 报告该表，从字节读取六个 4 字节值（5、8、12、20、20、35），证据标为 `bytes`，因为值表内部没有重定位。

`-O1` 的 `fold` 是旋转后的循环。块从 0x70、0x74、0x80、0x92、0x93 开始。0x80 块跳回自身，因此 (0x80, 0x80) 是唯一回边，自然循环是 `{0x80}`，0x80 的支配边界也是 `{0x80}`。`-O0` 的退出检查在循环头：回边为 0xe1 到 0xd9，循环头的后支配节点是退出块 0xfe。

```figure
pj-mini-decompiler-3
```

在实验中加入回到入口的边。入口在函数内部没有前驱，但有来自调用者的隐式边，因此入口进入自身的支配边界。下方 `dominance_frontiers` 契约要求覆盖此情况。

## 实现契约

在 `cfg` 模块实现以下内容。模板预置 `JumpTable`、`Descent`、`Block`、`FunctionGraph`、`find_value_tables`、`build_cfg`、`dominates`、`ControlFlowGraph.dominators`、`summary` 和寄存器辅助函数。

| 函数 | 契约 |
|---|---|
| `recursive_descent(code, entries, end=None, resolver=None) -> Descent` | 从 `entries` 建立工作列表。无条件跳转跟随目标，条件分支跟随两后继，调用后继续，返回则停止。地址落入已解码指令内部时记录冲突 `(address, instruction start)`。不可解码字节终止路径并列出。间接跳转停止，除非 `resolver` 返回 `JumpTable`。入口超出 `[0, end)` 时抛 `ValueError`。 |
| `bounds_check(instructions, before) -> (limit, address)` | `before` 前最后一条后接 `ja` 的 `cmp $N` 或 `sub $N`。没有则返回 `(None, None)`。 |
| `recover_table(elf, instructions, load, jump, section=".text") -> JumpTable or None` | 找到写入 `load` 基址寄存器的 RIP 相对 `lea`，解析重定位，读取 `limit + 1` 个宽 `scale` 字节的项；有重定位则从重定位读，否则从字节读。 |
| `jump_table_resolver(elf, section=".text") -> Resolver` | 从跳转向前匹配 `lea table(%rip), base; movslq (base, index, 4), reg; add base, reg; jmp *reg`。 |
| `ControlFlowGraph(entry, instructions, tables=None)` | 先 `_leaders` 再 `_build`：生成带类型后继边的块。入口必须是已解码地址，否则抛 `ValueError`。 |
| `reverse_postorder()`、`back_edges()`、`natural_loops()`、`post_dominators()` | 按名称计算。后支配关系使用每个返回块都可达的虚拟 `EXIT` 节点。 |
| `immediate_dominators(entry, order, predecessors) -> dict` | 在逆后序上运行 Cooper、Harvey、Kennedy 的迭代算法。 |
| `dominance_frontiers(idom, predecessors) -> dict[int, set[int]]` | 对有两个或更多前驱的汇合节点，从各前驱沿支配树走到汇合节点的直接支配节点。入口的前驱遍历继续到入口并包含入口。 |

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --stage 3 --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec cfg samples/samples-x86_64-O0.o band
```

JSON 显示 `unresolvedWithoutTables: ["0x76"]`、带 `"evidence": "relocation"` 的表、10 个块及各块直接支配节点。

## 失败案例

- 在 1 字节范围内以 4 为入口，抛 `ValueError`。
- `74 03 b8 01 00 00 00 c3`：`je` 目标为 5，落入 2 处的 `mov` 内部。下降记录冲突 `(5, 2)`，保留地址 0、2、7 的指令。
- `31 c0 0f 0a c3`：路径在不可解码字节 2 停止，列为未解析。
- `48 8b 45 f0 ff e0 c3`：通过栈加载值进行间接跳转，不匹配任何惯用法，保持未解析，图摘要列出 `0x4`。

## 扩展

- 解析非 PIC 代码的绝对跳转表形式 `jmpq *table(,%rax,8)`，使用 `R_X86_64_32S` 重定位。
- 检测尾调用：跳到其他函数符号的 `jmp`，视为调用后返回。
- 为不可约图计算循环嵌套森林，报告各循环额外入口。