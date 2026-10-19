# 化简并折叠惯用法

第 5 阶段，共 8 阶段。应用[提升到伪代码](../../../../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md)中的“阶段 6：化简、替换、消除死代码”，以及[编译器惯用法与优化](../../../../../phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/docs/zh.md)中的常量除法。

## 构建内容

构建将 SSA 语句转换为人可读表达式的变换过程：

- 自底向上化简：将标志位分支转为比较，折叠常量，移除 `+ 0` 和 `* 1`，折叠嵌套转换，将带缩放加载转为元素访问 `base[index]`，偏移加载转为字段访问 `base->field_4`；
- 复制与常量传播；
- 死代码消除；
- 合并所有边上均携带相同值的 phi；
- 单次使用替换，禁止把加载移过存储或调用；
- 识别有符号常量除法。

`optimize` 重复运行，直到没有任何变换再产生修改。

## 为什么重要

阶段 4 后，`-O1` 的 `tenths_and_fifths` 是 14 条包含乘法、移位和标志写入的语句，原始源码却只有一行。本阶段恢复这一行，每一步都可检查：改变函数值的变换会使阶段 8 的差分测试失败。

除法惯用法特别容易被错误折叠。接近正确值的乘数可能对小输入给出正确商，对大输入却出错。只有算术证明成立才允许折叠。

## 具体案例

`-O1` 下，clang 将 `value / 10 + value / 5` 编译为：

```text
movslq  %edi, %rax
imulq   $0x66666667, %rax, %rax
movq    %rax, %rcx
sarq    $0x22, %rcx        shift 34
movq    %rax, %rdx
shrq    $0x3f, %rdx        sign bit of the product
addl    %edx, %ecx         quotient for 10
sarq    $0x21, %rax        shift 33
addl    %edx, %eax         quotient for 5
addl    %ecx, %eax
```

形式为 `((long)x * m >> s) + sign bit`。恢复除数时，`magic_divisor(m, s)` 尝试 d = floor(2^s / m) 及 d + 1，只保留满足 m 为 2^s / d 的向上取整且误差足够小的 d（Granlund 和 Montgomery，1994）：

| m | s | d | m * d - 2^s | 上界 2^s / 2^31 | 折叠 |
|---|---|---|---|---|---|
| 0x66666667 | 34 | 10 | 6 | 8 | 是 |
| 0x66666667 | 33 | 5 | 3 | 4 | 是 |
| 0x55555556 | 32 | 3 | 2 | 2 | 是 |
| 0x66666668 | 34 | 无 | | | 否 |

手工检查一个输入。x = -7、d = 10，乘积为 -7 * 1717986919 = -12025908433。右移 34 位向负无穷取整得到 -1，乘积符号位为 1，相加得到 0，与 C 的 -7 / 10 一致。折叠前，`division_identity_holds` 在包含 `INT_MIN`、`INT_MAX` 及 -40 到 40 的样本上重复检查。

SSA 后两个共享值为 `rax_2 = rax_1 * 0x66666667` 和 `rdx_2 = rax_2 >>u 63`。化简器发现 `trunc32(rcx_2) + trunc32(rdx_2)`，其中 `rcx_2 = rax_2 >>s 34`，沿两侧追踪到同一乘积，将和替换为 `edi_0 / 10`。死代码消除删除不再被读取的乘积、移位和全部标志写入。函数最终只剩一条语句：

```text
return edi_0 / 10 + edi_0 / 5
```

`thirds` 用 `shrq $0x20` 求商。结果截断为 32 位；恰好右移 32 位时，逻辑移位与算术移位的低 32 位相同，因此只在移位量为 32 时接受逻辑移位。

`fold` 中，复制传播用 `esi_0` 替换 `ecx_1` 后，带 `jne` 的循环条件 `flags_6 = cmp(zext64(ecx_1), rdx_3)` 变为 `zext64(esi_0) != rdx_3`。四个循环 phi 中有两个（`eax_2` 和 `esi_2`）在各边携带相同值，因此合并，最终剩两个 phi。

```figure
pj-mini-decompiler-5
```

在实验中将除数设为 10、移位量设为 33。乘数为 0x33333334，误差 8 是上界 4 的两倍，因此必须保留输出中的乘法。

## 实现契约

在 `passes` 模块实现以下内容。模板预置 `c_div`、`truncate`、`OptimizeReport`、`place_of`、`definition_order`、`count_uses`、`has_call`、`contains_load`、`stmt_has_side_effect` 和 `simplify_function`。

| 函数 | 契约 |
|---|---|
| `magic_divisor(multiplier, shift) -> int or None` | 寻找 d > 1，使乘数等于 ceil(2^shift / d)，且 `multiplier * d - 2^shift <= 2^shift >> 31`。移位量不在 32 到 63、或乘数非正时返回 `None`。 |
| `division_identity_holds(multiplier, shift, divisor, samples=None) -> bool` | 对各样本按 64 位回绕计算惯用法，与 `c_div` 比较。 |
| `make_simplifier(defs, recognize_division, report=None, order=None)` | 返回供 `rewrite` 使用的函数，实现“构建内容”中的规则。每次折叠除法在 `report.divisions` 只记录一次。 |
| `remove_dead_code(fn, uses) -> int` | 删除目标未被使用的赋值或 phi，但保留含调用的赋值。 |
| `propagate_copies(fn) -> int` | 替换 `x = y`（同位宽）及 `x = constant` 的使用，不替换 phi 来源内部。 |
| `substitute_once(fn, uses) -> bool` | 将同一块内的单次使用定义移到使用处。含加载的值不能移过存储或调用。 |
| `merge_congruent_phis(fn) -> int` | 同块内两个 phi 若各边值相同且同宽，以先前 phi 替换后者。 |
| `optimize(fn, recognize_division=True, rounds=400) -> OptimizeReport` | 先化简，再依次运行死代码、复制、phi 合并与替换。任一改变后重新开始。 |

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --stage 5 --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec decompile samples/samples-x86_64-O1.o --function tenths_and_fifths --ir
python3 -m minidec decompile samples/samples-x86_64-O1.o --function tenths_and_fifths --ir --no-division-idioms
```

第一条命令在优化 IR 中打印 `return edi_0 / 10 + edi_0 / 5`，第二条保留 `0x66666667`、`>>s 34` 和 `>>u 63`。

## 失败案例

- `magic_divisor(0x66666667, 31)` 为 `None`：低于 32 的移位量不可能来自该惯用法。
- `magic_divisor(0x66666668, 34)` 为 `None`：比正确乘数大一，无法通过向上取整检查。
- `division_identity_holds(0x66666667, 34, 11)` 为假。
- 编译 `int f(void) { int x = -5; return x * -2; }` 的 `-O0` 目标文件。常量折叠只能计算当前运算，最终输出 `return 10;`；不能因预先计算无关的 `a << b` 而抛出负移位异常。
- `record` 对 `m->reads` 的加载先于存储。替换必须让 `ecx_2 = rdi_0->field_0 + 1` 保持在 `store32(rdi_0) = ecx_2` 上方，否则 C 会读取新值。

## 扩展

- 识别无符号除法：使用 `mul` 与 `shr`，没有符号修正；也支持乘数无法放入 32 位时 clang 生成的形式。
- 除法折叠后，将 `x - (x / d) * d` 识别为 `x % d`。
- 增加全局值编号，比较各测试函数变换前后的语句数。
