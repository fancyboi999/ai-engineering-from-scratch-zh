# 恢复签名与类型

第 6 阶段，共 8 阶段。应用[调用约定与栈帧](../../../../../phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/zh.md)中的“System V：两套独立寄存器序列与红区”，[提升到伪代码](../../../../../phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/zh.md)中的“阶段 4：根据调用约定识别参数”“阶段 7：根据使用推断类型”，以及[恢复数据与类型](../../../../../phases/13-tools-and-protocols/41-recovering-data-and-types/docs/zh.md)。

## 构建内容

为优化后的 SSA 函数恢复签名：

1. **参数。** System V psABI 通过 `%rdi`、`%rsi`、`%rdx`、`%rcx`、`%r8`、`%r9` 传递前六个 INTEGER 参数。读取版本 0 表示此前没有写入。最高读取的参数寄存器决定数量，因此只读 `%rsi` 的函数仍有两个参数。其他寄存器写前读取属于未定义读取，恢复器报告它，不当作参数。
2. **网。** phi 及其来源属于一个 C 变量。用并查集合并，每个网命名一次：参数为 `param_N`，栈槽为 `local_8`，寄存器值为 `eax_1`。
3. **类型。** 网内最宽定义决定 `int` 或 `long`。用作缩放元素访问基址的网成为元素指针，用作常量偏移基址的网成为结构体指针，各偏移一个字段。指针类型沿复制与 phi 传播。
4. **符号性。** 算术移位、有符号除法、有符号比较和符号扩展支持有符号。逻辑移位与无符号除法支持无符号。孤立的无符号比较是 `switch` 范围检查惯用法，不会令值成为无符号。
5. **返回类型。** 取各返回点 `%rax` 中值的宽度。没有路径写 `%rax` 时，结果为 `void`，该猜测列为未知项。

每个决策都携带支持它的指令。

## 为什么重要

机器码没有类型。参数数量错误会改变阶段 8 驱动中的调用；宽度错误会截断 `long`；符号性错误会翻转负数比较结果。这些 C 都能编译，却算出错误答案，因此每个类型都必须指向证据。

## 具体案例

阶段 5 后，`-O1` 的 `record` 如下：

```text
block 0xa0 -> exit
  ecx_2 = rdi_0->field_0 + 1
  store32(rdi_0) = ecx_2
  eax_2 = esi_0 + rdi_0->field_4
  store32(rdi_0 + 4) = eax_2
  return eax_2 / ecx_2
```

版本 0 读取为 `rdi_0` 和 `esi_0`。最高参数寄存器是 `%rsi`，因此有两个参数。`rdi` 按 64 位读取，`esi` 按 32 位读取。

`rdi_0` 是 32 位宽 `field_0` 和 `field_4` 的基址。其网成为 `struct record_param_1 *`，字段位于 0x0 和 0x4。返回值宽 32 位。签名报告如下：

```json
{
  "declaration": "int record(struct record_param_1 *param_1, int param_2)",
  "params": [
    {"name": "param_1", "register": "rdi", "width": 64, "ctype": "struct record_param_1 *", "signedness": "pointer",
     "evidence": ["%rdi is read before any write", "accessed through constant offsets 0x0, 0x4"]},
    {"name": "param_2", "register": "rsi", "width": 32, "ctype": "int", "signedness": "none",
     "evidence": ["%esi is read before any write"]}
  ],
  "structs": {"record_param_1": {"0x0": 32, "0x4": 32}},
  "evidence": ["2 argument register(s) read before write", "return value width 32 from the value in %rax at every return",
               "signed instructions: 0xae cltd; 0xaf idivl %ecx"]
}
```

`param_2` 的符号性为 `none`：没有指令直接对它做有符号或无符号选择，因此 `int` 是默认值，阶段 7 将此列为未知项。

另三个测试函数的结果：

| 函数 | 声明 | 判定证据 |
|---|---|---|
| `fold` | `int fold(int *param_1, int param_2)` | `(rdi, rdx, 4)` 是缩放的 4 字节访问；对 `param_2` 的 `jle` 为有符号 |
| `band` | `int band(int param_1)` | 仅 `cmp $5` 和 `ja` 接触它：`unsigned-compare`，即范围检查 |
| 未折叠除法的 `tenths_and_fifths` | `int tenths_and_fifths(int param_1)` | `movslq` 和 `sarq` 支持有符号 |

```figure
pj-mini-decompiler-6
```

在实验中清除 `%rdi`、保留 `%rsi`。参数数量仍为二，因为 psABI 按位置分配寄存器。将 `%esi` 证据改为 `cmp then ja`，类型保持 `int`，符号性变为 `unsigned-compare`。

## 实现契约

在 `types` 模块实现以下内容。模板预置 `Param`、`Signature`、`ctype`、`utype`、`declaration` 和 `live_keys`。

| 函数 | 契约 |
|---|---|
| `collect_params(fn)` | 将 `fn.params` 设置为从首个到最高版本 0 读取的参数寄存器，根据 `fn.def_width` 设置 `fn.param_widths`，其余版本 0 读取（除 `flags`、`rax`）放入 `fn.undefined_reads`。 |
| `coalesce_webs(fn)` | 合并各 phi 与来源，为每个 SSA 键设置 `fn.web_names`，按最宽成员将 `fn.web_types` 设为 `int` 或 `long`。 |
| `signedness_by_web(fn) -> dict[str, set[str]]` | 为每个网标签返回证据类型：`signed`、`unsigned-arithmetic`、`unsigned-compare`。 |
| `signedness_label(kinds) -> str` | `none`、`signed`、`unsigned`、`unsigned-compare` 或 `mixed`。`signed` 与任何其他证据并存则为 `mixed`；没有 `signed` 而有 `unsigned-arithmetic` 则为 `unsigned`。 |
| `infer_types(fn)` | 推断元素指针、带 `fn.structs` 的结构体指针、`unsigned` 网的无符号类型，以及 `fn.return_type`。 |
| `recover_signature(fn) -> Signature` | 运行上述四步，生成包含参数与指令证据的 `Signature`。 |

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --stage 6 --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec decompile samples/samples-x86_64-O1.o --function record --json
```

`--json` 输出包含签名报告及证据，上方 C 文本需要阶段 7。

## 失败案例

- 只读 `%esi` 的函数有两个参数，`param_1` 未使用。
- 写入前读取 `%r10` 的函数不能把它当参数。`r10` 进入 `undefinedReads`，网名为 `undefined_r10`。
- 未写 `%rax` 就返回的函数为 `void`，并注明调用者可能推翻这一判断。
- 同时被 `sarl` 和 `shrl` 使用的值为 `mixed`。类型保持有符号，阶段 7 为无符号使用添加转换。

## 扩展

- 读取返回地址上方的栈参数作为第七参数，并从 `%xmm0` 到 `%xmm7` 读取浮点参数。
- 合并两个接收同一指针的函数的结构体布局，报告同一偏移的位宽冲突。
- 检测经 `%rax` 和 `%rdx` 返回的结构体，以及经 `%rdi` 隐藏指针返回的大结构体。