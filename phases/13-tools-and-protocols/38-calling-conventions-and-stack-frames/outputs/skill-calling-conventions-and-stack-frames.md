---
name: calling-conventions-and-stack-frames
description: 从反汇编恢复调用约定与栈帧，指出每项推断的 ABI 规则，与源码签名及编译器展开数据核对。
version: 1.0.0
phase: 13
lesson: 38
tags: [reverse-engineering, calling-conventions, abi, stack-frames, system-v, microsoft-x64, aapcs64, prologue, unwind]
---

给定自行构建目标、其 `llvm-objdump -d -r` 列表及函数 C 签名，输出参数位置、栈帧布局、返回寄存器，并逐项对照 ABI 规则。适用于 Claude、Cursor、Codex、OpenClaw、Hermes 或任何读取 SKILL.md 的 agent。

## 必需输入

- 目标文件、精确编译命令和版本。
- 保存在目标旁的 llvm-objdump -d -r 列表。
- 各函数 C 签名、各结构类型字节大小。
- 头部 ABI：ELF e_machine 62 为 System V AMD64，COFF Machine 0x8664 为 Microsoft x64，ELF e_machine 183 为 AAPCS64，Mach-O cputype 0x0100000c 为 Apple arm64。
- 第 38 课分析器（code/main.py）或区分数据读取与地址读取的等价实现。
- 可选：未加 -fno-asynchronous-unwind-tables 的目标，用于 .eh_frame 或 .pdata/.xdata。

## 步骤

1. 从头确定 ABI，读取任何指令前先写明适用规范。
2. 读序言。x86-64 看 push、可选 mov rsp,rbp、sub N,rsp；AArch64 看 sub sp，以 sp 为基址保存 x19–x30 的 stp/str，以及 mov x29,sp 或 add x29,sp,#k。按入口 SP 记录各保存偏移，帧大小为序言最深 SP。
3. 遍历函数体，记录参数类寄存器中先读后写者。内存与 lea 的基址、索引也算读；mov、lea、cvtsi2sd、xor r,r 的目标只写。调用后将全部易失寄存器标为已写。
4. 记录入口 SP 上方的加载为栈参数：System V 从 8(rsp)，Microsoft 从影子上方 40(rsp)，AAPCS64 从 0(sp)。以已记录帧指针偏移换算 rbp/x29 寻址。
5. 结果寄存器在退出前最后访问为写时视为返回。作为数据读会取消候选，作为地址基址读不会。隐含结果指针是用于存储并复制到 rax 的首参数，或 AArch64 的 x8。
6. 将 ABI 应用于签名：System V 每八字节分 INTEGER/SSE/MEMORY，从双列表分配；Microsoft 按位置槽选 RCX/RDX/R8/R9 或 XMM0–3，非 1/2/4/8 字节结构按引用；AAPCS64 用 x[NGRN]、v[NSRN]，大于十六字节结果用 x8。逐规则比较预期和观察位置。
7. 查帧规则：被写的保留寄存器须在保存集；每调用 rsp+8 或 sp 按十六对齐；Microsoft 返回地址下至少三十二影子；Microsoft/AAPCS64 不访问 SP 下方，System V 至多 128；尾声恢复序言保存内容及入口 SP。
8. 有展开数据则解码：UWOP_PUSH_NONVOL/UWOP_ALLOC_* 对照 push 和分配，DW_CFA_offset 对照保存偏移，最深 CFA 对照最深 SP。
9. 有其他工具则用精确命令捕获同函数原型或参数列表，记录与源码和字节的一致、分歧。

## 必需报告

每函数报告：

- 文件名、格式、机器、ABI、编译器、命令、列表路径。
- 序言字节文本、保存寄存器入口偏移、帧字节、帧指针偏移或无。
- 先读后写参数寄存器、栈参数偏移、入帧参数保存及偏移、Microsoft home 存储。
- 返回寄存器或隐含指针，及设置它的指令。
- 调用深度、影子字节、SP 下使用字节。
- 每检查的规则、预期、观察、是否一致。
- 可用时逐函数展开核验。
- 其他工具输出和命令，将每处分歧列为发现。

## 必须拒绝

- 只因 x86-64 就按 System V，COFF 应用 Microsoft x64。
- cvtsi2sd 或 xor r,r 目标算读取，虚构参数。
- 丢弃只在 lea 基址或索引读取的寄存器，遗漏参数。
- 写后又作为数据消费的寄存器仍当返回。
- 仅 push rbp 就认帧指针，之后还需 mov rsp,rbp。
- 从 lea 报告栈参数；它计算地址，不加载。
- 从入口而非当前 SP 测红区。
- 函数体推输出参数时，将最深 CFA 与序言帧直接比较。
- 无源码或字节核验就接受工具原型。
- 分析非自行构建且未获研究授权的程序。

## 输出

返回以下部分：

1. ABI：格式、机器、规范、决定它的头字节。
2. 序言与帧：字节、保存寄存器、大小、帧指针、红区或影子。
3. 参数：观察寄存器与栈槽、签名预期、逐规则一致性。
4. 结果：返回寄存器或隐含指针及设置指令。
5. 调用点：深度、对齐、影子、输出寄存器和存储。
6. 展开核验：展开码/CFI 对比序言。
7. 其他工具：命令、输出、各项分歧发现。

最后给首项分歧。若无，说明一致检查数量和覆盖函数数。
