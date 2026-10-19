# 结构化控制流图并生成 C

第 7 阶段，共 8 阶段。应用[提升到伪代码](../../../../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md)中的“阶段 8：从图结构化”，以及[编译器惯用法与优化](../../../../../phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/docs/zh.md)中的旋转循环与值表。

## 构建内容

构建流水线最后两步，并组合整条流水线。

结构化器按 Cifuentes 的方法，从入口遍历图并匹配形状：

- 循环头（回边的目标块）若包含退出分支，则成为 `while (cond) { ... }`，否则为 `do { ... } while (cond);`。`do` 条件来自 latch，即分支回到循环头的块。
- 二路分支在直接后支配节点闭合。汇合点是两个后继之一时，成为单个 `if`。两臂都以返回结束时，较短臂成为提前返回的 `if`；其余为 `if-else`。
- 跳转表成为 `switch`，各索引一个 `case`，按目标分组；边界检查分支成为 `default`。
- 第二次到达的块成为 `goto block_<address>;`，并报告计数。

生成器利用优先级表将 IR 表达式打印为 C，在顶部声明所有非参数网，在函数之前打印结构体与表定义。`decompile` 为一个函数组合阶段 3 到 7 并列出全部未知项。`decompile_all` 按地址顺序运行，`translation_unit` 写出一个 C 文件。

## 为什么重要

本阶段输出是阶段 8 的输入。C 必须能被编译器接受，并说明猜测之处。goto 数量衡量图中还有多少部分无法由已有形状解释。测试固件在两种优化级别下均为零。

## 具体案例

`-O0` 的 `band` 含阶段 3 的跳转表。入口块 0x50 以 `ja 0xae` 结束，跳转后继是默认块；顺序后继 0x64 只含 switch，且只有前驱 0x50，因此分支变成 switch，跳转边成为 `default`。汇合点是 0x50 的直接后支配节点 0xb5。

```c
int band(int param_1)
{
  long local_10;
  int local_4;

  local_10 = (unsigned long)(unsigned int)param_1;
  switch (local_10) {
  case 0:
    local_4 = 5;
    break;
  ...
  case 5:
    local_4 = 35;
    break;
  default:
    local_4 = -1;
    break;
  }
  return local_4;
}
```

`-O1` 没有跳转表。值表读取为 `lookup_0[...]`，0x58 的分支在其跳转后继 0x66 汇合，结果是条件取反的单个 `if`：

```c
static const int lookup_0[6] = {5, 8, 12, 20, 20, 35};

int band(int param_1)
{
  int eax_1;

  eax_1 = -1;
  if ((unsigned int)param_1 <= 5) {
    eax_1 = lookup_0[(unsigned long)(unsigned int)param_1];
  }
  return eax_1;
}
```

转换 `(unsigned int)param_1` 精确保留 `ja` 的无符号比较：-1 与原版一样越界。表长 6 来自 `.rodata` 中下一个被代码引用的偏移，或节末尾。这是启发式规则，因此 `unknowns` 会说明。

`-O1` 的 `fold` 展示另两种形状。入口分支在出口汇合，`0x93` 臂只有一个块，因此成为 `if (param_2 <= 0) { return 0; }`。0x80 循环从 latch 退出，因此为 `do-while`：

```c
  do {
    eax_1 = (esi_1 << 5) - esi_1 + param_1[rdx_1];
    rdx_1 = rdx_1 + 1;
    esi_1 = eax_1;
  } while ((unsigned long)(unsigned int)param_2 != rdx_1);
```

`(esi_1 << 5) - esi_1` 即 `esi_1 * 31`：clang 用移位和减法替代了乘法。

```figure
pj-mini-decompiler-7
```

在实验中修改后支配节点，查看分支变成哪种形状。再清除循环头退出复选框，观察循环从 `while` 变为 `do-while`。

## 实现契约

实现以下内容。模板预置 `negate`、`natural_loops`、`post_dominators`、`Structurer` 辅助方法（`emit`、`terminator`、`body`、`region_size`、`switch_head`、`run`）、`structure`、`Emitter`、`Decompiled` 和 `PRECEDENCE`。

| 函数 | 契约 |
|---|---|
| `Structurer.walk(block_id, stop, depth)` | 生成从 `block_id` 到 `stop` 的区域。已生成的块转为计数 goto；循环头调用 `emit_loop`；否则生成主体并跟随终止语句。 |
| `Structurer.emit_branch(block, term, stop, depth)` | 上述四种分支形状，顺序块为单前驱 switch 头时按 switch 处理。 |
| `Structurer.emit_switch(block, term, default, join, depth)` | 按索引顺序、按目标分组的 case 标签，各区域后接 `break;`，最后 `default`。 |
| `Structurer.emit_loop(header, stop, depth)` | 循环头分支离开循环且头不是自身 latch 时用 `while`，否则用 `do-while`。从首个退出块继续。 |
| `compare_constants(fn) -> list[int]` | 比较所用全部常量。阶段 8 将各常量及相邻值加入输入网格。 |
| `table_values(elf, section, offset, width) -> list[int]` | 从 `offset` 到同节下一个代码引用偏移或节末尾的有符号值。 |
| `struct_definition(name, fields) -> str` | 每个偏移一个 `field_<offset>`，空隙用 `char pad_<offset>[n]`。 |
| `decompile(elf, name, recognize_division=True, signatures=None) -> Decompiled` | 建图、提升、SSA、优化、签名、结构化、生成，最后给出未知项列表。 |
| `decompile_all(elf, recognize_division=True, functions=None)` | 按地址顺序运行，将早期签名传给后续调用。 |
| `translation_unit(results) -> str` | 结构体定义一次、表定义一次，之后逐个函数，末尾换行。 |

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --stage 7 --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec decompile samples/samples-x86_64-O1.o
python3 -m minidec decompile samples/samples-x86_64-O0.o --out decompiled-O0.c
python3 -m minidec decompile your-object.o --json
```

最后一行接受用 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c` 编译的目标文件。超出子集的函数会抛出注明地址的解码或提升错误。

## 失败案例

- 不匹配任何形状的区域生成 `goto block_<address>;`，未知项加入 "goto statement(s) remain"。大括号不平衡属于缺陷，测试会计数。
- 未写 `%rax` 的函数生成 `return;`，并注明 `void` 只是猜测。
- 结构体指针注明看不到字段名及未访问字段；元素指针注明看不到 `const` 与元素数量。
- `--no-division-idioms` 保留乘法。输出仍可编译，并计算相同函数。

## 扩展

- 循环有初始值、比较和递增的归纳变量时生成 `for`。
- 两个分支共享目标时，将短路条件（`a && b`）合并为一个 `if`。
- 用节点拆分而非 goto 重构不可约区域，并比较输出大小。