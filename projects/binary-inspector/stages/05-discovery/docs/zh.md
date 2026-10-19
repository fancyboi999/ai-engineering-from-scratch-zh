# 字符串归属与函数入口恢复

第 5 阶段，共 6 阶段。实现第 [40](../../../../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md) 课的函数入口识别方法，并同样以未剥离构建的符号表为基准评分。

## 构建内容

在 `discovery` 模块中实现三个函数：

- `extract_strings(data, section_list, segment_list=(), min_length=4)` 查找可打印 ASCII 和 UTF-16LE 连续串，并标明所属节和段。
- `function_starts(data)` 返回五种独立方法找到的入口地址。
- `score_starts(found, truth)` 将某种方法与真值比较。

## 为什么重要

不带节名的 `strings` 会混合 `__cstring` 中的格式串、`__LINKEDIT` 中的符号名和机器代码内的随机连续串。给每个字符串标注所属节，才能区分程序打印的字符串与加载器读取的字符串。

strip 之后，反汇编器必须判断函数从哪里开始。每种方法只看到部分真相，也都有已知失败条件。以已知答案的构建为基准评分，得到精确率（报告的入口中有多少真实入口）和召回率（真实入口中找到了多少）。

| 方法 | 来源 | 失败条件 |
|---|---|---|
| symbols | 代码节内已定义的函数符号 | strip 将其删除 |
| function starts table | `LC_FUNCTION_STARTS` 的 ULEB128 差值 | 格式没有此表 |
| prologues | arm64 的 `sub sp, sp, #imm` 或 `stp x29, x30, [sp, #-n]!`；x86-64 的 `push rbp; mov rbp, rsp` 或 `endbr64` | 编译器未生成栈帧，如 `-O2` 的叶函数 |
| call targets | 代码节内 arm64 `bl` 和 x86-64 `e8` 的目标 | 没有代码调用该函数，如 `main` |
| entry | `e_entry`、`AddressOfEntryPoint`、`LC_MAIN` | 入口只能对应一个函数 |

## 具体案例

剥离后的 arm64 构建中，`LC_FUNCTION_STARTS` 指向 `__LINKEDIT` 中以下字节：

```text
e8 0b  d8 02  88 02  20  28  24  00
```

每个值都是 ULEB128 差值。首个差值相对 `__TEXT` 地址 `0x100000000`：

| 字节 | 差值 | 入口 |
|---|---|---|
| `e8 0b` | `0x5e8` | `0x1000005e8` |
| `d8 02` | `0x158` | `0x100000740` |
| `88 02` | `0x108` | `0x100000848` |
| `20` | `0x20` | `0x100000868` |
| `28` | `0x28` | `0x100000890` |
| `24` | `0x24` | `0x1000008b4` |
| `00` | 结束 | |

未剥离构建在这些地址有六个函数符号：`_main`、`_tally_sum`、`_tally_scale`、`_tally_bucket`、`_tally_name`、`_tally_checksum`。精确率和召回率均为 1.0。`_banner` 位于不含指令的 `__TEXT,__const`，因此不算函数入口。

调用目标。`0x100000628` 处的字为 `46 00 00 94`，读作 `0x94000046`。最高六位 `100101` 表示 `bl`。低 26 位为 70，乘 4 得 `0x118`，因此目标是 `0x100000740`，即 `_tally_sum` 的入口。目标为 `__stubs`（`printf`、`puts`）的 `bl` 指令被排除，因为桩不是本程序的函数。剩余五个目标。没有代码调用 `main`，所以召回率为 5/6 = 0.8333。

序言。`main` 的首字为 `ff 83 01 d1`，即 `0xd10183ff`，匹配 `(word & 0xff0003ff) == 0xd10003ff`：`sub sp, sp, #0x60`。`-O2` 的五个 tally 函数都是无栈帧叶函数，因此扫描仅找到六个中的一个，召回率 0.1667；`-O0` 则找到全部六个。x86-64 ELF 目标文件中，`push rbp; mov rbp, rsp` 在 `-O0` 找到 5/5，在 `-O2` 找到 0/5。

`recovered` 列表是函数入口表、调用目标和程序入口的并集。不包含序言，因为序言模式是这里唯一可能匹配函数内部字节的方法。

```figure
pj-binary-inspector-5
```

在实验中选择构建与组合方法，并加入假阳性。实验用同样六个地址计算真阳性、精确率和召回率。

## 实现契约

`extract_strings(data, section_list, segment_list=(), min_length=4) -> list[dict]`

- `min_length` 小于 1 时抛出 `ValueError`。
- ASCII：字节 `0x20` 到 `0x7e` 以及制表符组成的连续串，长度至少为 `min_length`。文件末尾的连续串也计入。
- UTF-16LE：可打印字节后接 `0x00` 的连续串，至少 `min_length` 个字符。
- 各项为 `{"offset", "text", "encoding", "section", "segment"}`，按偏移排序。`section` 来自 `section_at_offset`。`segment` 取所属节的段，否则取文件范围包含该偏移的段，否则为 `None`。

`function_starts(data) -> dict`，以下键的值均为排序去重的整数列表：

- `symbols`：已定义 `"func"` 符号的值，所属节必须是代码节，值必须落在节内。可重定位文件中这些值是节内偏移。
- `function_starts_table`：解码后的 `LC_FUNCTION_STARTS`，其他格式为 `[]`。
- `prologues`：仅在代码节内匹配模式，arm64 按 4 字节步长扫描。
- `call_targets`：可重定位文件为 `[]`，因为调用位移仍为零；其他文件取代码节内目标。
- `entry`：`[header["entry"]]` 或 `[]`。
- `recovered`：`function_starts_table`、`call_targets`、`entry` 的并集。

代码节要求 `code` 为真、有文件字节，且名称不属于 `__stubs`、`__auth_stubs`、`__stub_helper`、`.plt`、`.plt.sec`。

`score_starts(found, truth) -> dict` 返回 `{"found", "truth", "true_positives", "false_positives", "missed", "precision", "recall"}`。按唯一地址计数。`false_positives` 和 `missed` 为排序列表。未找到任何入口时精确率为 0.0，真值为空时召回率为 1.0。两者舍入到 4 位小数。

## 验证与检查

```bash
python3 scripts/project_test.py binary-inspector --stage 5 --path learning-artifacts/binary-inspector --strict
```

测试中的入口地址与未剥离构建的 `nm -n`、剥离构建的 `dyld_info -function_starts` 一致。

## 探索失败边界

- 在 `main` 中间写入 `0xd10083ff`。序言扫描在该处报告假阳性，精确率降为 0.5。评分展示这种方法的代价。
- 将同一字写入 `__TEXT,__const`。该节不含指令，扫描必须忽略。
- 将 `LC_FUNCTION_STARTS` 截成单字节 `0x80`。ULEB128 读取器必须抛异常。
- 列出剥离可执行文件在 `__LINKEDIT` 中的字符串。160 字节的 `LC_DYLD_EXPORTS_TRIE` 仍含边 `hecksum`、`ounter`、`cale`、`bucket`、`main`、`tally_`。strip 改写根节点，只让 `__mh_execute_header` 可达，却保留旧节点。字符串扫描能找到它们，阶段 4 的 trie 读取器则找不到，因为没有可达节点指向它们。

## 扩展

- 按第 40 课增加 FLIRT 风格签名。屏蔽目标文件各函数的重定位字节，再在每个恢复入口匹配结果。
- 增加链接后 PE 映像的 `.pdata` 方法：每个 `RUNTIME_FUNCTION` 条目给出一个函数入口。
- 将相邻入口的间距报告为函数大小上界。

## 参考资料

- [Apple ld64 and dyld, LC_FUNCTION_STARTS in mach-o/loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)
- [Arm A64 instruction set: BL, SUB (immediate), STP](https://developer.arm.com/documentation/ddi0602/latest/)
- [Andriesse, Slowinska, Bos, "Compiler-Agnostic Function Detection in Binaries", EuroS&P 2017](https://danielandriesse.com/papers/eurosp-2017.pdf)
- [Ghidra AARCH64 function start patterns](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/AARCH64/data/patterns/AARCH64_LE_patterns.xml)
