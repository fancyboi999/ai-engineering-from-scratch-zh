# 提升到 IR 并构建 SSA

第 4 阶段，共 8 阶段。应用[提升到伪代码](../../../../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md)中的“阶段 3：提升为小型 IR”“阶段 5：SSA，每个定义一个名称”，以及[调用约定与栈帧](../../../../../phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/zh.md)中的帧指针序言。

## 构建内容

构建两个组件。

提升器将每条已解码指令转为 IR 语句。IR 包含赋值、存储、分支、跳转、通过恢复表进行的 switch 和返回。表达式包括常量、带位宽的变量、二元操作、转换、加载、标志记录和节地址。寄存器变成以 64 位寄存器族命名的变量（写 `eax` 即以 32 位宽写 `rax`）。标志寄存器成为名为 `flags` 的普通变量。栈帧管理（`push`、`pop`、`mov %rsp, %rbp`、栈调整）不生成语句；相对 `%rbp` 常量偏移的槽变成 `local_8` 等局部变量。

SSA 构建器为每个定义分配独立版本。在各变量定义点的迭代支配边界放置 phi，沿支配树重命名使用，并在使用宽度与读取定义宽度不同时插入转换。

## 为什么重要

x86-64 指令同时做多件事。`subl %edi, %esi` 写 `%esi` 及六个标志位，后续 `jle` 读取其中两个。若提升器把标志表示为变量，阶段 5 就能识别 `testl %esi, %esi` 后的 `jle` 意味着 `esi <= 0`，死代码消除也能删除没有分支读取的标志写入。

SSA 将后续问题局部化。“这个使用读取哪个值？”只有一个答案：相同版本的唯一定义。来自两条路径的值用 phi 表示，phi 列出各前驱提供的版本。

## 具体案例

`-O1` 的 `fold` 有五个块。SSA 之前，提升后的循环块 0x80 如下：

```text
block 0x80 -> 0x80, 0x92
  eax = eax << 5
  flags = cmp(eax, esi)
  eax = eax - esi
  flags = add(eax, load32(rdi + rdx * 4))
  eax = eax + load32(rdi + rdx * 4)
  flags = inc(rdx, 1)
  rdx = rdx + 1
  esi = eax
  flags = cmp(rcx, rdx)
  if jne(flags) goto 0x80 else goto 0x92
```

循环内定义 `eax`、`rdx`、`esi` 和 `flags`。回边来自 0x80 自身，因此循环头 0x80 位于自己的支配边界。`insert_phis` 在 0x80 为各变量放置 phi，共四个。`ecx` 只在支配边界为空的 0x74 定义，因此没有 phi。

重命名沿支配树依次访问 0x70、0x74、0x80，然后 0x92 和 0x93：

```text
block 0x74 -> 0x80
  ecx_1 = esi_0
  edx_1 = 0
  esi_1 = 0
  eax_1 = esi_1
block 0x80 -> 0x80, 0x92
  esi_2 = phi(0x74: esi_1, 0x80: esi_3)
  rdx_2 = phi(0x74: edx_1, 0x80: rdx_3)
  eax_2 = phi(0x74: eax_1, 0x80: eax_5)
  flags_2 = phi(0x74: flags_1, 0x80: flags_6)
  ...
  flags_6 = cmp(zext64(ecx_1), rdx_3)
```

版本 0 是函数入口值：`esi_0` 为第二个参数，`rdi_0` 为第一个。这里有两个宽度事实。`ecx_1` 是 32 位定义，而 `cmp(rcx, rdx)` 读取 64 位，因此使用变为 `zext64(ecx_1)`；写入 32 位寄存器会清空高半部。`rdx` 的 phi 同时接收 32 位来源（`edx_1 = 0`）与 64 位来源（`rdx_3`），因此拓宽到 64 位。

`-O0` 的同一循环将值放在栈槽。`movl %edi, -0x8(%rbp)` 提升为 `local_8 = rdi`，循环头 0xd9 为 `local_10` 和 `local_14` 生成 phi。

```figure
pj-mini-decompiler-4
```

在实验中移动 `x` 的定义位置。只在一条分支定义，会在汇合处插入 phi。增加回到入口的边后，入口获得一个 phi，第一来源为入口值 `x_0`。

## 实现契约

实现以下内容。模板预置 IR dataclass、`LiftContext`、`children`、`rebuild`、`rewrite`、`iter_nodes`、`variables`、`stmt_exprs`、`map_stmt`、`IrPrinter` 和 `to_ssa`。

| 函数 | 契约 |
|---|---|
| `lift_instruction(insn, ctx) -> list` | 将一条指令转为 IR 语句。`sub`、`cmp` 写 `Flags("cmp", destination, source)`；`test` 写 `Flags("test", ...)`；`xor r, r`、`sub r, r` 写常量 0。`cltd` 写 `rdx = signfill(rax)`；`idivl` 先写 `dividend = rdx:rax`，再写商和余数。带重定位的 RIP 相对操作数为 `Symbolic(section, offset)`。调用利用已知签名变成 `rax = call name(args)`。没有规则的指令抛出含地址的 `LiftError`。符号性证据写入 `ctx.signedness`。 |
| `lift_function(elf, graph, signatures=None) -> Function` | 按地址顺序提升全部可达块。不可达块与未解析跳转写入 `notes`。将图的支配关系复制到 `fn.idom`。 |
| `insert_phis(fn) -> int` | 在各变量定义点的迭代支配边界放置 phi。入口块的 phi 另接收以 `EXIT` 为键的 `Var(name, 0, 0)`。返回插入数量。 |
| `rename(fn)` | 沿支配树为每个变量维护版本栈，版本 0 为入口值。将各定义宽度记录到 `fn.def_width`，把 phi 拓宽到最宽来源，为宽度与定义不一致的使用包裹 `zext` 或 `trunc`。 |
| `check_single_assignment(fn) -> list[str]` | 返回定义超过一次的 `name_version` 键。空列表表示函数已是 SSA 形式。 |

IR 语句可变，按对象身份比较；表达式冻结，按值比较。

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --stage 4 --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec decompile samples/samples-x86_64-O1.o --function fold --ir
```

`--ir` 输出 SSA 之前的 IR 及 SSA 形式。末尾的反编译 C 需要阶段 5 到 7。

## 失败案例

- `cmovg`（`0f 4f c1`）可解码，但提升器没有规则，应抛出指出 0x40 的 `LiftError`。
- 寄存器首次写入之前的使用为版本 0，由阶段 6 判断是否为参数。
- 同时接收 32 位和 64 位版本的 phi 必须拓宽；若保留 32 位，生成的 C 会截断循环索引。
- 循环头恰为入口时，phi 必须包含入口值来源，否则第一次迭代会读取未定义版本。

## 扩展

- 将 `setcc`、`cmovcc` 提升为条件表达式，用含三元运算符的固件测试。
- 将 flags 变量拆成六个独立标志，展示哪些分支只读 ZF。
- 将最小 phi 放置替换为剪枝 SSA：变量在汇合处不活跃时跳过 phi。