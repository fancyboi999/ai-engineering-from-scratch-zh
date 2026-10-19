# 验证输出

第 8 阶段，共 8 阶段。应用[重建并验证等价](../../../../../phases/13-tools-and-protocols/36-rebuild-and-prove-equal/docs/zh.md)中的“分支一：执行与比较”“分支二：重编译与比较”，报告部分应用[二进制分析中的证据、置信度与未知项](../../../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/docs/zh.md)。

## 构建内容

构建 `verify` 命令，将反编译文本转为带证据的结论。包含两个验证分支和一份报告。

**字节验证。** 使用测试固件选项（`-target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c`）重编译 `decompiled.c`。逐函数从原版和候选目标文件切出字节，将双方全部重定位字段清零后比较。再比较重定位的偏移、类型和目标节，以及各 PC 相对重定位指向的数据节中的字。目标是未定义外部符号（`SHN_UNDEF`）时，还必须核对符号名与加数，否则调用不同函数或指向同一符号的不同位置会被掩码隐藏。掩码字节相同但表内容不同，仍算差异。

**行为验证。** 编译原始源代码、全部函数重命名为 `cand_<name>` 的候选版，以及生成的 C 驱动。每个输入单元给驱动一行。驱动以相同内存的副本调用双方，打印双方结果及调用后内存，除法触发陷阱则打印 `trap`。两行不同的单元均为不匹配。

**报告。** `report.json` 逐函数列出签名、行为状态及分类单元数、字节状态及原因、阶段 7 的全部未知项和未运行的验证分支。汇总在证据不足时保守失败。

## 为什么重要

可读 C 不能证明任何东西。貌似正确的反编译输出可能将有符号比较改成无符号，仍能编译；行为验证负责运行它。几个输入正确，仍可能在 `INT_MIN` 出错，因此网格刻意覆盖极限值。字节验证提出更严格的问题：同一编译器、相同选项是否生成相同函数？若答案为是，这份 C 就是该优化级别下生成该函数的一份源代码。

## 输入网格

为每个参数配置值集合，再取笛卡尔积，最多 400 个单元：

| 参数 | 值 |
|---|---|
| int，函数没有指针参数 | 0、1、-1、2、7、10、-10、100、`INT_MAX`、`INT_MIN` |
| int，与指针同时出现 | 0、1、3、8、-1、100（计数保持在 4096 字缓冲区内） |
| 每个比较常量 c | 增加 c - 1、c、c + 1 |
| 指针 | 五种 8 字模式：全零、递增、混合正负、极限值、全 -1 |

各单元标为 `limit`、`compare-edge`、`zero`、`negative` 或 `plain`，报告据此展示网格覆盖范围。

## 具体案例

对已提交的 `-O1` 目标文件和源代码运行：

```bash
python3 -m minidec verify samples/samples-x86_64-O1.o --source samples/samples.c --opt O1 --out verify-O1
```

| 函数 | 单元数 | 行为 | 字节 | 原因 |
|---|---|---|---|---|
| `tenths_and_fifths` | 10 | pass | pass | |
| `thirds` | 100 | pass | pass | |
| `band` | 13 | pass | pass | |
| `fold` | 30 | pass | differs | 大小 38 对 40 字节 |
| `record` | 30 | pass | pass | |

`band` 有 13 个单元：10 个基础值，加上比较常量 5 周围的 4、5、6。这三个单元属于 `compare-edge`。掩码字节相同，两份目标文件的重定位都指向 `.rodata+0x0`，内容均为 `[5, 8, 12, 20, 20, 35]`。

`fold` 通过全部 30 个行为单元，但重编译循环长 2 字节。反编译循环将 `long` 计数器与零扩展计数比较，源码却用 `int` 索引，clang 因此生成不同指令序列。汇总为 `behaviour-only`：网格上计算结果相同，字节不同。

`-O1` 的 `band` 掩码步骤：函数长 0x17 字节，唯一重定位在偏移 0xf，宽 4，因此比较前将两份副本的 0xf 到 0x12 字节清零。

若候选源代码只改一个表值（case 4 返回 21），其掩码字节和重定位形状仍相同。只有常量检查能发现 `[5, 8, 12, 20, 21, 35]`，将状态设为 `differs`，原因为 "referenced constants differ"。

`-O0` 汇总也为 `behaviour-only`：`band` 大小不同（106 对 114 字节），因为生成的 switch 使用源码没有的 `long` 索引。`record` 有 8 字节不同，因为生成 C 不保留参数的栈副本，而 `-O0` 原版会保留。

```figure
pj-mini-decompiler-8
```

在实验中增加指针参数，观察每个标量的值数从 10 降为 6、单元数乘 5。清除 `clang on PATH` 复选框，两分支和汇总都变成 `unknown`。

## 实现契约

在 `verify` 模块实现以下内容。模板预置常量、`fixture_flags`、`find_clang`、`host_description`、`read_referenced`、`ByteComparison`、`Cell`、`driver_source`、`Harness`、`build_harness`、`parse_result`、`run_cells` 和 `BehaviourReport`。

| 函数 | 契约 |
|---|---|
| `recompile(source, opt, out) -> Path` | 用 `fixture_flags(opt)` 运行 clang。缺少 clang 或编译错误时抛出含编译器文本的 `VerifyError`。 |
| `mask_relocations(data, relocations) -> (bytes, ranges)` | 将各重定位偏移处的 `width` 字节清零；返回掩码字节及 `(offset, width)` 范围。 |
| `compare_function_bytes(original, candidate, name, tables=None) -> ByteComparison` | 比较掩码字节、重定位形状、引用常量。任一重定位指向 `SHN_UNDEF` 时，要求双方均为未定义符号，且符号名与加数相同。命名的 `.text` 目标要求符号名与加数相同；双方都是 `.text` 节符号时，比较 `symbol.value + addend`。数据节保留原有映射与常量比较规则。候选缺少函数时为 `unknown`，绝不算通过。 |
| `classify(args, constants) -> str` | 按输入网格一节的优先级给单元分类。 |
| `input_grid(signature, constants=None, limit=400) -> list[Cell]` | 上述值集合的笛卡尔积，不重复单元。 |
| `differential_test(original_source, candidate_source, decompiled, opt, workdir)` | 构建测试程序，运行各函数网格。 |
| `aggregate(behaviour, bytes_status) -> str` | 任一行为失败则 `fail`；没有函数或任一分支未知则 `unknown`；所有字节通过则 `pass`；否则 `behaviour-only`。 |
| `evidence_report(...) -> dict` | JSON 报告，含各结论的边界。 |
| `verify(object_path, source_path=None, opt="O1", out_dir=None, functions=None, recognize_division=True) -> dict` | 反编译，写 `decompiled.c`，重编译并比较字节；源码和 clang 存在时运行网格，写 `report.json`。 |

CLI 的 `verify` 对 `pass`、`behaviour-only` 退出 0，对 `fail`、`unknown` 退出 1，因此 CI 可据此阻断。

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --all --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec verify samples/samples-x86_64-O1.o --source samples/samples.c --opt O1 --out verify-O1
python3 -m minidec verify your-object.o --source your-source.c --opt O1 --out verify-yours
```

`PATH` 没有 clang 时，重编译与差分测试跳过，原因为 "clang is not on PATH: the recompile leg cannot run; the committed-object legs still ran"。跳过测试不能作为完成证据，应安装 clang 后完成项目。掩码、网格、驱动、汇总及已提交目标文件测试在所有主机上运行。

## 失败案例

- `int f(int a) { return a +; }` 使 `recompile` 抛出以 "recompile failed" 开始的 `VerifyError`。
- `fold` 使用 `long` 累加器的候选长 45 字节，原版 38，原因为 "size 38 vs 45 bytes"。
- 将 `band` 与不含 `band` 的目标比较，状态为 `unknown`，原因含函数名。
- 不传源码的 `verify` 为各函数写行为 `unknown`，未知项含 "was not compared"；即使全部字节比较通过，汇总仍为 `unknown`。
- `fixture_flags("O9")` 抛 `ValueError`。

## 结论边界

行为验证为宿主机编译原始源代码与候选。在 arm64 主机上比较 C 源码行为，不执行已提交的 x86-64 目标文件。通过仅覆盖本机网格，不能证明所有输入等价。字节验证只对应一个编译器版本与一组选项。指针参数以 `void *` 传入驱动，符合 psABI，因为它将所有指针放入 INTEGER 寄存器。

## 扩展

- 在 x86-64 模拟器下直接运行已提交目标文件，使行为验证也覆盖原始机器码。
- 增加按目标文件 hash 设种子的随机验证，在报告记录种子，便于重放不匹配。
- 编写最小化器，将不匹配单元缩减为仍产生差异的最小输入。
