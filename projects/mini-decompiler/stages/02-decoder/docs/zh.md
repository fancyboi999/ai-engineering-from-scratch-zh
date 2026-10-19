# 解码 x86-64 子集

第 2 阶段，共 8 阶段。应用[反汇编与控制流](../../../../../phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/zh.md)中的“指令格式的每个字段各有规则”和“线性扫描”。

## 构建内容

构建解码器，覆盖 clang 在 `-O0` 和 `-O1` 为测试固件生成的 x86-64 子集。`decode(code, address)` 读取一条指令，返回包含字节、规范化操作、操作数、位宽、控制流类型与分支目标的 `Instruction`，同时记录位移与立即数字段在指令中的位置。`linear_sweep` 按地址顺序解码字节范围，列出无法解码的每个字节。

解码器对照反汇编清单校验。四个已提交目标文件中，每条指令的地址、字节和 AT&T 文本都必须与捕获清单一致。

## 为什么重要

后续所有阶段都信任解码器。位宽错误会将 32 位值变成 64 位值，重编译的 C 就会与原版不同。字段偏移错误会让阶段 3 漏掉承载跳转表基址的 `lea` 重定位。

清单提供无需主观判断的参考。不能凭外观认定解码正确，必须比较。

## 支持的子集

| 类别 | 编码 |
|---|---|
| 前缀 | `66`、`67`、`f2`、`f3`、`f0`，段覆盖 `2e 36 3e 26 64 65`，随后一个 `40` 到 `4f` 的 REX 字节 |
| ALU | `01 09 11 19 21 29 31 39 85 89`（Ev, Gv）、`03 0b 13 1b 23 2b 33 3b 8b`（Gv, Ev）、累加器形式、组 `81 83` |
| 数据 | `88 8a`、`8d` lea、`b8`+r mov、`c7 /0`、`63` movslq、`0f b6 b7 be bf` movzx 和 movsx |
| 算术 | `69 6b 0f af` imul、`c1 d1` 移位、`f7` test/not/neg/mul/imul/div/idiv、`99` cltd、`ff /0 /1` |
| 控制流 | `70`-`7f`、`0f 80`-`8f`、`e8`、`e9`、`eb`、`ff /2 /4`、`c3`、`0f 90`-`9f` setcc、`0f 40`-`4f` cmovcc |
| 其他 | `90`、`0f 1f` 多字节 nop、`cc`、`0f 0b`、`50`-`5f` push 和 pop |

其余内容抛出包含地址与操作码字节的 `DecodeError`。

## 具体案例

`-O1` 的 `tenths_and_fifths` 在地址 0x3 处的字节是 `48 69 c0 67 66 66 66`。

| 偏移 | 字节 | 字段 | 含义 |
|---|---|---|---|
| 0 | `48` | REX | W=1，因此操作数为 64 位 |
| 1 | `69` | 操作码 | `imul Gv, Ev, Iz`：三个操作数、32 位立即数 |
| 2 | `c0` | ModRM | mod=3（寄存器形式）、reg=0（`rax`）、rm=0（`rax`） |
| 3 到 6 | `67 66 66 66` | 立即数 | 0x66666667，符号扩展为 64 位 |

结果为 `imulq $0x66666667, %rax, %rax`，长度 7、位宽 64、`immediate_offset` 为 3。删除 `48` 后，相同字节解码为操作数宽 32 位的 `imull`。两种形式算出不同值，阶段 5 只在 64 位乘积中识别除法惯用法。

`-O0` 的内存操作数：0x6f 处 `48 63 04 81` 为 `movslq (%rcx,%rax,4), %rax`。ModRM `04` 的 mod=0、rm=4，后接 SIB。SIB `81` 的 scale 为 1 << 2 = 4、index 为 0（`rax`）、base 为 1（`rcx`）。

RIP 相对操作数：0x5c 处 `48 8d 0d 00 00 00 00` 为 `leaq (%rip), %rcx`。ModRM `0d` 的 mod=0、rm=5，在 64 位模式中表示 RIP 加 32 位位移。位移字段从偏移 3 开始，绝对地址为 0x5f，即阶段 1 重定位的 `r_offset`。

分支：0x58 处 `77 0c` 是 `ja`，8 位位移为 12。目标为指令末端加 12：0x5a + 0xc = 0x66。

```figure
pj-mini-decompiler-2
```

在实验中输入其他字节，如 `48 63 04 81` 或 `66 0f 1f 44 00 00`。为其编写解码分支前，先读字段表。

## 实现契约

在 `decoder` 模块中实现以下内容。模板预置操作数类、`Instruction` dataclass、AT&T 渲染器、`_Cursor`、`_State` 辅助方法（`operand_size`、`register`、`immediate`、`displacement`、`finish`、`relative`）、`parse_objdump`、`compare_with_objdump` 和 `disassemble`。

| 函数 | 契约 |
|---|---|
| `decode(code: bytes, address: int) -> Instruction` | `address` 是 `code` 的索引。读取传统前缀，再读至多一个 REX 字节，然后操作码；`0f` 选择双字节映射。地址超出 `code` 时抛 `DecodeError`。 |
| `_State.modrm(reg_width, rm_width) -> (Reg, Reg or Mem, int)` | 读取 ModRM，内存形式再读 SIB 和位移。REX.R 扩展 reg，REX.X 扩展 index，REX.B 扩展 rm 或 base。mod 0、rm 5 为 RIP 相对。SIB index 4 表示无索引；SIB base 5 且 mod 0 表示无基址、32 位位移。 |
| `_one_byte(state, opcode) -> Instruction` | 子集表中的单字节操作码。 |
| `_two_byte(state, opcode) -> Instruction` | 子集表中的 `0f` 操作码。 |
| `linear_sweep(code, start=0, end=None) -> SweepResult` | 从 `start` 解码到 `end`。遇到 `DecodeError`，将 `(address, byte)` 记入 `undecodable`，从下一字节继续。 |

操作数顺序遵循 AT&T：源在前，目标在后。`Instruction.flow` 为 `next`、`branch`、`jump`、`call`、`return`、`indirect-jump` 或 `indirect-call`。立即数为有符号，唯独 `mov` 与移位计数按清单以无符号打印。

## 验证与检查

```bash
python3 scripts/project_test.py mini-decompiler --stage 2 --path learning-artifacts/mini-decompiler --strict
cd learning-artifacts/mini-decompiler
python3 -m minidec disasm samples/samples-x86_64-O1.o --oracle samples/samples-x86_64-O1.objdump.txt
```

模板将测试目标文件和清单复制到 `samples`。也可传入自己的目标文件和用 `llvm-objdump -d -r` 捕获的清单。命令逐条打印指令及重定位目标，然后报告 `oracle: 56/56 instructions agree with llvm-objdump`。`-O0` 目标文件有 102 条指令，留出文件分别有 76 和 38 条。

## 失败案例

- 在地址 1 解码 `90 0f 0a`，抛出原因包含 `0f 0a` 的 `DecodeError`。
- `48 69 c0 67 66` 在立即数内部终止，应抛异常而非越界读取。
- 十五个 `66` 前缀加 `90` 共 16 字节，超过架构限制 15 字节，应抛异常。
- 线性扫描 `31 c0 0f 0a c3`，得到 `xorl %eax, %eax`、地址 2 和 3 的两个不可解码字节、`retq`。

## 扩展

- 增加带 `f2` 前缀和 XMM 寄存器的 `movsd`、`cvtsi2sd`，将参考比对扩展到使用 `double` 的固件。
- 增加 VEX 前缀（`c4`、`c5`），从自己编译的循环解码一条 AVX 指令。
- 让 `linear_sweep` 在解码错误后从下一函数符号重启，测量恢复的指令数。