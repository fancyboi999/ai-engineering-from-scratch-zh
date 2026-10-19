# README 的使用规则与法律

> 只有拥有分析权利时才能分析程序，本手册通过自行编写每个目标取得这一权利。

供应商发来二进制，你身边的 agent 八秒就能反编译。第一条命令之前，先回答两个问题：程序归谁所有？对并非你编写的副本，法律允许做什么？rea 不会询问这两件事。`DISCLAIMER.md` 将责任交给你，以下法律条文与判决说明答案须包含什么。

读完本节，你能指出哪条规则允许分析程序，以及本手册所有目标为何符合条件。本节解读一手来源，不提供法律建议。

## 固定标签的使用规则

```rule
label: the use rule
source: readme DISCLAIMER.md, Responsible use
---
"You are responsible for obtaining any required authorization and for complying with applicable laws, license agreements and terms of service. Reverse engineering may be restricted in your jurisdiction or by the license of the software you analyze."
```

规则位于该标签 `DISCLAIMER.md` 的 `Responsible use` 标题下。README 的 `Disclaimer` 标题指向该文件，并写道：“REA 用于合法研究、教育、互操作、软件保存，以及分析你拥有或获授权检查的软件。”{{readme Disclaimer}}。这一立场适用于所有 REA 版本与分发渠道。

`DISCLAIMER.md` 也列出项目不支持的用途。首项为绕过 DRM、许可证检查、反作弊系统及其他保护措施，随后是游戏作弊、绕过认证或访问控制、复制专有软件。最后两项是规避 AI 提供方使用政策，以及转售或共享 AI 账户。

## 美国：17 U.S.C. 1201

**规避：** 1201(a)(3)(A) 定义为“未经著作权人授权，对扰码作品解扰、对加密作品解密，或以其他方式避开、绕过、移除、停用或损害技术措施”{{law 17 U.S.C. 1201(a)(3)(A)}}。1201(a)(1)(A) 禁止这种行为。

1201(f) 是逆向工程例外，叠加四项限制。当事人须“合法取得使用计算机程序副本的权利”。规避须“仅为识别和分析实现独立编写的计算机程序与其他程序互操作所必需的程序要素”。这些要素“此前未曾便捷地提供给当事人”。相关行为不得“构成本编规定的侵权”{{law 17 U.S.C. 1201(f)(1)}}。

1201(f)(4) 定义关键词：“互操作指计算机程序交换信息，以及这些程序相互使用已交换信息的能力。”{{law 17 U.S.C. 1201(f)(4)}}。1201(j) 涉及安全测试，定义为“经所有者或运营者授权，仅为善意测试、调查或修正安全缺陷或漏洞，而访问计算机、计算机系统或计算机网络”{{law 17 U.S.C. 1201(j)(1)}}。

1201(f) 仅是反规避规则的例外，不判定分析时制作的副本是否侵犯著作权。1201(c)(1) 将此问题留给著作权法：“本节不影响著作权侵权的权利、救济、限制或抗辩，包括合理使用。”{{law 17 U.S.C. 1201(c)(1)}}。下方两个判决回答这一问题。

## 欧盟：Directive 2009/24/EC

第 1(2) 条奠定基础：“计算机程序任何要素所依据的思想与原则，包括接口所依据的思想与原则，不受本指令的著作权保护。”{{law Directive 2009/24/EC Article 1(2)}}。随后两条赋予合法用户两种权利。

第 5(3) 条是研究运行程序的权利：“有权使用计算机程序副本的人，无需权利人授权，即可观察、研究或测试程序功能，以确定程序任何要素所依据的思想与原则，前提是在进行其有权进行的加载、显示、运行、传输或存储程序等行为时实施。”{{law Directive 2009/24/EC Article 5(3)}}。欧盟法院在 C-406/10 案中适用此条：被许可方未反编译，而是研究 SAS System 以在另一程序重现功能，不构成侵权。

第 6(1) 条是反编译权。若“为取得独立编写的计算机程序与其他程序互操作所必需的信息，必须进行第 4(1) 条 (a)、(b) 项意义上的代码复制及形式转换”，则无需授权{{law Directive 2009/24/EC Article 6(1)}}。之后有三项条件：第一，由有权使用副本的人实施；第二，“实现互操作所需信息此前未曾便捷提供”{{law Directive 2009/24/EC Article 6(1)(b)}}；第三，“行为限于实现互操作所必需的原程序部分”{{law Directive 2009/24/EC Article 6(1)(c)}}。

第 6(2)(c) 条禁止将结果用于“开发、生产或销售表达形式实质相似的计算机程序”{{law Directive 2009/24/EC Article 6(2)(c)}}。合同不能剥夺这些权利。第 8 条规定：“任何违反第 6 条或第 5(2)、5(3) 条例外的合同条款均无效。”{{law Directive 2009/24/EC Article 8}}。C-13/20 案增加第三条路径：合法购买者可按第 5(1) 条为纠错而反编译，无需满足第 6 条条件，但“仅限于实现该修正所必需的程度”{{law C-13/20 ruling 2}}。

## 两个判决：Sega v. Accolade 与 Sony v. Connectix

Sega Enterprises Ltd. v. Accolade, Inc., 977 F.2d 1510（第九巡回上诉法院，1992）案中，Accolade 购买 Genesis 主机与卡带，反汇编目标代码，编写接口要求手册，再开发自己的游戏。法院认为：“反汇编是接触受著作权保护程序所含思想与功能要素的唯一方式，且寻求接触有正当理由时，反汇编依法属于对该作品的合理使用。”{{law Sega v. Accolade, 977 F.2d at 1527-1528}}。Accolade 仅保留主机要求的 20 到 25 字节头部代码。

Sony Computer Entertainment, Inc. v. Connectix Corp., 203 F.3d 596（第九巡回上诉法院，2000）案中，Connectix 开发不含 Sony 代码的模拟器时，多次将 PlayStation BIOS 复制到内存。法院认为：“Connectix 在对 Sony BIOS 逆向工程过程中制作和使用的中间副本属于受保护的合理使用，是让其不侵权的 Virtual Game Station 运行 PlayStation 游戏所必需的。”{{law Sony v. Connectix, 203 F.3d 596}}。

法院列出接触程序功能要素的四种方式，其中两种是静态检查指令、动态检查运行程序，均称为反汇编。两案保护的是中间副本，并未认可最终产品包含复制代码。

```figure
id: fig-2-1
kind: decision
title: 第一条命令前的五个问题
claim: 第一条命令前须回答来自 17 USC 1201(f)、Directive 2009/24/EC、Sega、Connectix 的五个问题；本手册的测试固件通过设计满足全部条件。
caption: 自上而下阅读五个问题，首次回答否时沿玫红虚线箭头走。依据是 Sources 行中的法律与判决，文件名来自 capture/out/00-fixtures.txt。
```

## 本手册的规则

本手册每个目标均专门编写。C 源码为 `ledger.c`、`ledger-main.c`，`js-app/` 是六文件应用，`wasm/ledger.wat` 是手写模块。捕获工具记录其 hash 与大小：

```listing
title: 测试固件及 hash
source: capture/out/00-fixtures.txt
lang: text
note: 仅保留两个 C 源文件、两个 arm64 可执行文件、模块及其文本。省略目标文件、JavaScript 文件和冒烟测试程序。
---
01b5d08b…   33872  fixtures/ledger-arm64-O1
…
8bbbaa58…   33872  fixtures/ledger-arm64-O2
…
80af384b…     743  fixtures/ledger-main.c
…
4564c3e7…     568  fixtures/ledger.c
…
699f6ff7…     290  fixtures/wasm/ledger.wasm
2e0b5792…    1841  fixtures/wasm/ledger.wat
```

对这些文件，[图中](#fig-2-1)五个问题都有明确答案：你自行编译，因此持有副本；目的是学习；源码就在二进制旁，比较两者正是目的，无需其他途径；整个程序属于你，因此分析部分和表达也属于你。

本手册从不分析保护措施、许可证检查、防篡改方案、游戏或不属于你的程序。除自身测试固件外，不对其他运行程序插桩。

分析其他程序之前，先回答五个问题并写下来。从合法取得的副本开始，明确法律规定的目的：1201(f) 和第 6 条的互操作、第 5(3) 条的研究、第 5(1) 条的纠错，以及 1201(j) 经所有者授权的安全测试。

检查所需事实是否已经发布，将工作限制在必要部分，最终产品使用自己的表达。许可证或合同有额外条款时，阅读条款。1201(f) 不凌驾于合同法，第 8 条也只使违反第 5(2)、5(3)、6 条的条款无效。

```takeaways
- 先读一遍 `DISCLAIMER.md`。取得授权是你的责任，rea 不会检查。
- 第一条命令前写下合法副本、明确目的和缺失事实。
- 只分析自己编写或获授权检查的程序，本手册每节均如此。
- 中间副本仅用于分析，发布内容不包含复制代码。
```

Sources: readme Disclaimer (rea README.md); rea DISCLAIMER.md, Responsible use, at 27dc42d; law: 17 U.S.C. 1201(a)(1)(A), (a)(3)(A), (c)(1), (f)(1), (f)(4), (j)(1), Directive 2009/24/EC Articles 1(2), 5(1), 5(3), 6(1), 6(2)(c), 8, CJEU C-406/10 and C-13/20, Sega v. Accolade, 977 F.2d 1510, Sony v. Connectix, 203 F.3d 596; capture/out/00-fixtures.txt
