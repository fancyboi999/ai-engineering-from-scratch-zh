# 清晰的技术写作

课程正文借鉴简化技术英语的清晰表达规则。每项都能由审阅者或脚本检查。手册审计和技能文件测试使用同一套规则。中文采用短句、明确主体和统一术语，不宣称符合英文标准。

## 适用范围

规则适用于段落、列表、标题、表格单元格、图注、图标题、图描述与图中文字。

以下内容免检：

- 行内代码与代码块
- 直引号或弯引号中的引用文字
- 引文标记，例如 `{{spec §4.1}}`

## 长度限制

| 单位 | 限制 |
|---|---|
| 英文句子 | 最多 25 词 |
| 英文指令、要点或步骤 | 最多 20 词，使用祈使句 |
| 英文中心论点 | 一句，最多 30 词 |
| 英文图表断言 | 一句，最多 28 词，以句号结束 |
| 段落 | 一个主题，最多六句 |

词由连续字母、数字以及 `$ % . ' / -` 构成。分句器不在 `e.g.`、`i.e.`、`vs.`、`etc.`、`approx.`、`Fig.`、`No.`、`U.S.`、`Inc.`、`Dr.`、`Mr.`、`Ms.`、`p.` 后断句。该计数仅适用于英文。

## 标点与语法

1. 不用长短破折号，改用冒号、逗号或句号。
2. 不用分号，拆成短句。
3. 英文不使用缩写形式，写 "do not"、"it is"、"you are"。
4. 英文不用 "may"，改写为 "can"，或说明条件。
5. 指令直接使用祈使句，例如“运行审计”，不要描述某个人如何运行。
6. 优先使用主动语态和一般现在时。
7. 一个概念只用一个术语。定义一次后全文保持一致。
8. 用第二人称对一位读者写作。

## 禁用表达

每行列出禁用英文形式和直接表达。禁用形式放在行内代码中，避免本文件自己的检查器误报。

### 比喻表达

| 禁用形式 | 替代含义 |
|---|---|
| `wire`, `wires`, `wired`, `wiring` | 请求、响应、流、网络、连接 |
| `stick`, `sticks`, `sticky`, `sticking`, `stuck` | 保持、保留 |
| `glue`, `plumbing` | 直接说明代码名称 |
| `knob`, `knobs` | 设置、选项 |
| `gotcha`, `gotchas`, `footgun`, `footguns` | 缺陷、陷阱、错误 |
| `under the hood` | 内部 |
| `escape hatch` | 覆盖设置、选项 |
| `sharp edge`, `sharp edges` | 限制、缺陷 |
| `first-class`, `first class` | 内置、支持 |
| `out of the box` | 默认 |
| `heavy lifting` | 主要工作 |
| `moving parts` | 部件、组件 |
| `sweet spot` | 最佳值、范围 |
| `deep dive`, `deep-dive` | 详细分析 |

### 动词短语

| 禁用形式 | 替代含义 |
|---|---|
| `boil down`, `boils down` | 简化为、是 |
| `spin up`, `spins up`, `spinning up`, `spun up` | 启动、创建 |
| `kick off`, `kicks off`, `kicked off`, `kicking off` | 启动 |
| `bake in`, `baked in`, `baked` | 包含、内置 |
| `fall back`, `falls back`, `falling back`, `fallback`, `fallbacks` | 改用、默认选择、第二选择 |

### 名词动用

| 禁用形式 | 替代含义 |
|---|---|
| `gate`, `gates`, `gated`, `gating` | 允许、阻止、要求、检查 |
| `surface`, `surfaces`, `surfaced`, `surfacing` | 显示、返回、报告。作名词时使用“面板”或“区域” |
| `fronts`, `fronted`, `fronting` | 置于前面、提供服务 |
| `land`, `lands`, `landed`, `landing` | 到达、合并、出现 |
| `ship`, `ships`, `shipped`, `shipping` | 发布、包含 |
| `fan out`, `fan-out`, `fans out`, `fanned out` | 发送给多个对象、并行启动 |
| `catch`, `catches`, `catching` | 发现、检测、处理 |
| `in flight`, `in-flight` | 运行中、未完成 |
| `out of band`, `out-of-band` | 协议外、单独 |
| `bare` | 普通 |
| `hand off`, `hands off`, `handed off`, `hand over`, `hand to`, `handoff`, `handoffs` | 发送、给出、传递 |

### 常见 AI 套话

| 禁用形式 | 替代含义 |
|---|---|
| `delve`, `delves`, `delving` | 查看、阅读 |
| `robust`, `robustly`, `robustness` | 可靠、经过测试、强 |
| `seamless`, `seamlessly` | 直接、不中断 |
| `crucial`, `crucially` | 必要、必需 |
| `comprehensive`, `comprehensively` | 完整 |
| `landscape` | 领域、选项 |
| `tapestry` | 删除 |
| `testament` | 证据 |
| `furthermore`, `moreover`, `additionally` | 也，或另起一句 |
| `leverage`, `leverages`, `leveraged`, `leveraging` | 使用 |
| `actually` | 删除 |
| `foster`, `fosters`, `fostered`, `fostering` | 帮助、支持 |
| `garner`, `garners`, `garnered`, `garnering` | 获得、收到 |
| `intricate`, `intricacies` | 详细、细节 |
| `meticulous`, `meticulously` | 仔细 |
| `quietly` | 删除，或直接说明发生什么 |
| `showcase`, `showcases`, `showcased`, `showcasing` | 显示 |
| `underscore`, `underscores`, `underscored`, `underscoring` | 显示、证明 |
| `vibrant` | 删除 |
| `enhance`, `enhances`, `enhanced`, `enhancing` | 改进、添加 |
| `interplay` | 两者的关系 |
| `align with`, `aligns with`, `aligned with` | 匹配、遵循 |
| `enduring` | 持久、永久 |
| `bolster`, `bolsters`, `bolstered`, `bolstering` | 支持、补充 |
| `highlight`, `highlights`, `highlighted`, `highlighting` | 显示、标记、指出 |
| `valuable` | 有用，或说明具体收益 |
| `journey` | 路径、步骤 |
| `unlock`, `unlocks`, `unlocked`, `unlocking` | 允许、使之可行 |
| `supercharge` 及其变化形式 | 删除 |

### 套话特征

审计还会标记以下句式：

| 模式 | 应避免的示例 |
|---|---|
| “不是 X 而是 Y” | `not just a cache but a store` |
| 空泛强调 | `crucially`, `importantly`, `notably`, `ultimately`, `essentially`, `fundamentally` |
| 夸大措辞 | `game-changing`, `paradigm`, `pivotal`, `groundbreaking`, `revolutionary`, `unprecedented`, `cutting-edge` |
| 刻意避开“是”或“有” | `serves as`, `stands as`, `acts as a testament`, `underscores`, `highlights the` |
| 铺垫式开场 | `here is the thing`, `here is why`, `here is what` |

## 语气

- 直接表达，删除填充词与开场套话。
- 不用营销断言和最高级。
- 标题和正文不用 emoji。
- 说明真实系统，写出具体字段、方法、文件或数字。

## 检查器

对 Markdown 文件运行下列脚本。它剔除行内代码、代码块和引文，再按行号报告命中项。通过时不输出。

```javascript
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const LEXICON = [
  /\bwir(e|es|ed|ing)\b/i,
  /\b(stick(s|y|ing)?|stuck)\b/i,
  /\b(glue|plumbing|knobs?|gotchas?|footguns?)\b/i,
  /\b(under the hood|escape hatch|sharp edges?|first[- ]class|out of the box|heavy lifting|moving parts|sweet spot|deep[- ]dive)\b/i,
  /\b(boils? down|spin(s|ning)? up|spun up|kick(s|ed|ing)? off|bak(e|es|ed|ing)[- ]in|baked|fall(s|ing)? back|fallbacks?)\b/i,
  /\b(gat(e|es|ed|ing)|surfac(e|es|ed|ing)|front(s|ed|ing)|land(s|ed|ing)?|ship(s|ped|ping)?|fan(s|ned|ning)?[- ]out|catch(es|ing)?)\b/i,
  /\b(in[- ]flight|out[- ]of[- ]band|bare|hand(s|ed|ing)? (off|over|to)|handoffs?)\b/i,
  /\b(delv(e|es|ing)|robust(ly|ness)?|seamless(ly)?|crucial(ly)?|comprehensive(ly)?|landscape|tapestry|testament|furthermore|moreover|leverag(e|es|ed|ing)|additionally|actually|foster(s|ed|ing)?|garner(s|ed|ing)?|intricate|intricacies|meticulous(ly)?|quietly|showcas(e|es|ed|ing)|underscor(e|es|ed|ing)|vibrant|enhanc(e|es|ed|ing)|interplay|align(s|ed)? with|enduring|bolster(s|ed|ing)?|highlight(s|ed|ing)?|valuable|journey|unlock(s|ed|ing)?|supercharg\w*)\b/i,
];
const CONTRACTION = /\b(\w+n['’]t|it['’]s|that['’]s|there['’]s|here['’]s|what['’]s|who['’]s|let['’]s|\w+['’]re|\w+['’]ve|\w+['’]ll|\w+['’]d|I['’]m)\b/i;
const text = fs.readFileSync(process.argv[2], 'utf8').replace(/^---\n[\s\S]*?\n---\n/, m => m.replace(/[^\n]/g, ''));
let fence = false;
text.split('\n').forEach((raw, i) => {
  if (/^\s*```/.test(raw)) { fence = !fence; return; }
  if (fence) return;
  const line = raw.replace(/`[^`]*`/g, '').replace(/[“"][^”"]*[”"]/g, '');
  const hit = rule => console.log(`${i + 1}: ${rule}: ${raw.trim().slice(0, 90)}`);
  if (/[—–]/.test(line)) hit('dash');
  if (line.includes(';')) hit('semicolon');
  if (/\bmay\b/i.test(line)) hit('may');
  if (CONTRACTION.test(line)) hit('contraction');
  for (const pattern of LEXICON) { const m = pattern.exec(line); if (m) hit(`word "${m[0]}"`); }
  for (const s of line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)) {
    const words = (s.match(/[\w$%.'/-]+/g) || []).length;
    if (words > 25) hit(`${words} words`);
  }
});
```

脚本只检查英文 25 词限制。指令与段落限制需人工检查，或按文件类型扩展脚本。
