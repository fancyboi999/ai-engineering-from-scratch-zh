# 写作规则

手册借鉴简化技术英语的清晰表达限制。审计覆盖段落、列表、表格、要点、图表断言、图注、示例说明。引用、代码和引文标记免检。中文采用短句原则，不宣称符合英文标准。

## 语气

- 用第二人称对一位读者解释机制。
- 每节从读者经历过的场景切入。
- 术语定义一次，全文一致，并加入术语表。
- 每段一个主题。

## 长度限制

| 单位 | 英文限制 |
|---|---|
| 句子 | 最多 25 词 |
| 中心论点 | 一句，最多 30 词 |
| 图表断言 | 一句，最多 28 词，以句号结束 |
| 要点 | 指令，最多 20 词 |
| 段落 | 最多六句 |

词由连续字母、数字或 `$ % . ' / -` 构成。行内代码计一词，引文标记计零词。该分词仅适用于英文。

## 禁用形式

- 不用分号，拆句。
- 不用长短破折号，用冒号、逗号或句号。
- 英文不缩写，例如 `don't`、`it's`、`you're`。
- 英文不用 `may`，使用 can 或说明条件。
- 不使用空泛强调： `crucially`, `importantly`, `notably`, `ultimately`, `essentially`, `fundamentally`.
- 不用夸大表达： `game-changing`, `paradigm`, `pivotal`, `groundbreaking`, `revolutionary`, `unprecedented`, `cutting-edge`.
- 不刻意回避“是”或“有”： `serves as`, `stands as`, `acts as a testament`, `underscores`, `highlights the`.
- 不用铺垫式开场，例如 `here's why` or `here's the thing`.
- 不用“不是 X 而是 Y”句式，直接说明事实。

## 禁用词

每行列出禁用英文表达和替代方式。

| 表达 | 替代方式 |
|---|---|
| `wire`, `wires`, `wired`, `wiring` | 真实事物：请求、响应、流、网络 |
| `stick`, `sticky`, `stuck` | 保持、保留 |
| `glue`, `plumbing`, `knob`, `gotcha`, `footgun` | 代码、设置、缺陷 |
| `under the hood`, `escape hatch`, `sharp edge`, `first-class`, `out of the box`, `heavy lifting`, `moving parts`, `sweet spot`, `deep dive` | 直接用词 |
| `boil down`, `spin up`, `kick off`, `bake in`, `fall back`, `fallback` | 一个直接动词 |
| `gate`, `surface`, `front` （作动词）, `land`, `ship`, `fan out`, `catch` | 直接动词，不把名词或比喻当动词 |
| `in flight`, `out of band`, `bare`, `hand off`, `hand over`, `hand to`, `handoff` | 具体用词：协议外、普通、发送、给出 |
| `delve`, `robust`, `seamless`, `crucial`, `comprehensive`, `landscape`, `tapestry`, `testament` | 直接用词 |
| `furthermore`, `moreover`, `leverage`, `additionally`, `actually`, `foster`, `garner`, `intricate` | 直接用词 |
| `meticulous`, `quietly`, `showcase`, `underscore`, `vibrant`, `enhance`, `interplay`, `align with` | 直接用词 |
| `enduring`, `bolster`, `highlight`, `valuable`, `journey`, `unlock`, `supercharge` | 直接用词 |

检查包括词尾变化，gated、ships、landing 也会失败。说明真实动作，例如“操作者在协议之外批准部署”。

## 改写示例

| 原句 | 改写 |
|---|---|
| `The server may close the stream.` | `The server can close the stream.` or `The server closes the stream when the job ends.` |
| `The client sends a cancel; the server ignores it.` | `The client sends a cancel. The server ignores it.` |
| `Errors surface in the response.` | `The response holds the errors.` |
| `This ships in 1.0.` | `Version 1.0 adds this.` |
